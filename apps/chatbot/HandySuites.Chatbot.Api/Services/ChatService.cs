using System.Runtime.CompilerServices;
using System.Text;
using HandySuites.Chatbot.Api.Data;
using HandySuites.Chatbot.Api.Dtos;
using HandySuites.Chatbot.Api.Hubs;
using HandySuites.Chatbot.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Chatbot.Api.Services;

/// <summary>
/// Orquesta el turno de chat (RAG + moderacion + silencio del bot) y el handoff/lead.
/// Contrato SSE hacia el widget: frames `data: {"delta":"..."}` y final `data: {"done":true,...}`.
/// </summary>
public class ChatService
{
    // Umbrales RAG (ajustables). Score = 1 - distancia coseno (1.0 = match perfecto).
    private const double MinScore = 0.25;       // piso de recuperacion
    private const int TopK = 4;                  // chunks de contexto
    private const double HandoffThreshold = 0.32; // por debajo => ofrecer asesor
    private const int MaxMessageLength = 2000;
    private const int HistoryTurns = 10;

    private readonly ChatDbContext _db;
    private readonly OpenAiClient _ai;
    private readonly ConversationStreamRegistry _reg;
    private readonly IHubContext<InboxHub> _hub;
    private readonly AgentNotifier _notifier;
    private readonly IConfiguration _cfg;
    private readonly ILogger<ChatService> _log;

    public ChatService(
        ChatDbContext db, OpenAiClient ai, ConversationStreamRegistry reg,
        IHubContext<InboxHub> hub, AgentNotifier notifier, IConfiguration cfg, ILogger<ChatService> log)
    {
        _db = db;
        _ai = ai;
        _reg = reg;
        _hub = hub;
        _notifier = notifier;
        _cfg = cfg;
        _log = log;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Turno de chat (SSE). Yields = payloads JSON (sin el prefijo "data: ").
    // ─────────────────────────────────────────────────────────────────────────
    public async IAsyncEnumerable<string> StreamTurnAsync(
        Conversation conv, string message, [EnumeratorCancellation] CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        message = (message ?? string.Empty).Trim();
        if (message.Length > MaxMessageLength) message = message[..MaxMessageLength];

        // Auto-reanudacion perezosa: human vencido => el bot retoma.
        if (conv.Mode == ConversationMode.Human && conv.ModeExpiresAt is { } exp && exp <= now)
        {
            conv.Mode = ConversationMode.Bot;
            conv.ModeExpiresAt = null;
            if (conv.Status == ConversationStatus.Active) conv.Status = ConversationStatus.Bot;
            _reg.Publish(conv.Id, new VisitorEvent("system", "El asistente retoma la conversacion."));
            await _hub.Clients.Group("agents").SendAsync("ConversationResumed", new { conversationId = conv.Id }, ct);
        }

        // Persistir mensaje del visitante (visible de inmediato para la bandeja).
        _db.Messages.Add(new ChatMessage
        {
            ConversationId = conv.Id, Role = MessageRole.Visitor, Content = message, CreadoEn = now
        });
        conv.LastVisitorAt = now;
        conv.ActualizadoEn = now;
        if (conv.Mode == ConversationMode.Human) conv.UnreadForAgent += 1;
        await _db.SaveChangesAsync(ct);

        // MODO HUMANO: el bot NO responde. Empuja al agente; el visitante espera por SSE.
        if (conv.Mode == ConversationMode.Human)
        {
            await _hub.Clients.Group($"conv:{conv.Id}")
                .SendAsync("VisitorMessage", new { conversationId = conv.Id, text = message, at = now }, ct);
            await _hub.Clients.Group("agents")
                .SendAsync("InboxActivity", new { conversationId = conv.Id, at = now }, ct);
            yield return ChatJson.S(new { done = true, mode = "human", botSuppressed = true });
            yield break;
        }

        // PII: el LLM (moderacion, embeddings, chat, historial) NUNCA recibe PII cruda.
        // El mensaje original ya quedo persistido arriba para que el asesor lo vea.
        var safeMessage = PiiRedactor.Redact(message);

        // MODO BOT — moderacion de entrada (bloquea ANTES de generar).
        if (await _ai.IsFlaggedAsync(safeMessage, ct))
        {
            const string neutral = "Lo siento, no puedo ayudarte con eso. Puedo responder dudas sobre Handy Suites, sus funciones y precios.";
            _db.Messages.Add(new ChatMessage
            {
                ConversationId = conv.Id, Role = MessageRole.Bot, Content = neutral, CreadoEn = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);
            yield return ChatJson.S(new { delta = neutral });
            yield return ChatJson.S(new { done = true, handoff = false });
            yield break;
        }

        // RAG: recuperar contexto.
        var hits = await SearchKbAsync(safeMessage, ct);
        var topScore = hits.Count > 0 ? hits[0].Score : 0.0;
        var handoff = hits.Count == 0 || topScore < HandoffThreshold;

        var systemPrompt = BuildSystemPrompt(hits);
        var history = await BuildHistoryAsync(conv.Id, ct);
        var stats = new StreamStats();

        // Generar COMPLETO en buffer (para poder moderar la salida antes de mostrarla).
        var sb = new StringBuilder();
        await foreach (var delta in _ai.StreamChatAsync(systemPrompt, history, stats, ct))
            sb.Append(delta);
        var answer = sb.ToString().Trim();

        if (string.IsNullOrWhiteSpace(answer))
        {
            answer = "No tengo esa informacion a la mano. Si quieres, te paso con un asesor.";
            handoff = true;
        }
        else if (await _ai.IsFlaggedAsync(answer, ct))
        {
            _log.LogWarning("Salida del modelo marcada por moderacion (conv {Id}); se reemplaza.", conv.Id);
            answer = "Prefiero no responder eso. Puedo ayudarte con dudas sobre Handy Suites o pasarte con un asesor.";
            handoff = true;
        }

        // Redaccion de PII en la SALIDA (el bot nunca emite/persiste correo/telefono/RFC/etc.).
        answer = PiiRedactor.Redact(answer);

        // Emitir la respuesta ya moderada en trozos (efecto de escritura).
        foreach (var part in ChunkForTyping(answer))
        {
            ct.ThrowIfCancellationRequested();
            yield return ChatJson.S(new { delta = part });
        }

        // Persistir respuesta del bot + estado.
        var sourcesJson = hits.Count > 0
            ? ChatJson.S(hits.Select(h => new { slug = h.Slug, title = h.Title, score = Math.Round(h.Score, 3) }))
            : null;
        _db.Messages.Add(new ChatMessage
        {
            ConversationId = conv.Id, Role = MessageRole.Bot, Content = answer,
            Confidence = topScore, Sources = sourcesJson, TokensUsed = stats.CompletionTokens,
            CreadoEn = DateTime.UtcNow
        });
        conv.ResolvedByBot = !handoff;
        conv.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var clientSources = hits.Select(h => new { title = h.Title, snippet = Truncate(h.ChunkText, 160) });
        yield return ChatJson.S(new { done = true, handoff, sources = clientSources });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handoff explicito (boton "Hablar con una persona").
    // ─────────────────────────────────────────────────────────────────────────
    public async Task RequestHandoffAsync(Conversation conv, HandoffRequest body, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        conv.Status = ConversationStatus.Waiting;
        conv.ResolvedByBot = false;
        conv.ActualizadoEn = now;

        _db.Messages.Add(new ChatMessage
        {
            ConversationId = conv.Id, Role = MessageRole.System,
            Content = "El visitante solicito hablar con un asesor.", CreadoEn = now
        });

        var reason = string.IsNullOrWhiteSpace(body.Reason) ? "explicit" : body.Reason;
        await UpsertLeadAsync(conv,
            name: body.Lead?.Nombre, email: body.Lead?.Email, phone: body.Lead?.Telefono,
            company: null, companySize: null, message: body.Lead?.Mensaje,
            intent: null, reason: reason, consent: body.Consent);

        await _db.SaveChangesAsync(ct);

        _reg.Publish(conv.Id, new VisitorEvent("system", "Te estamos pasando con un asesor. En breve te atienden."));
        await _hub.Clients.Group("agents")
            .SendAsync("InboxWaiting", new { conversationId = conv.Id, publicId = conv.PublicId, at = now }, ct);
        await _notifier.NotifyHandoffAsync(conv, ct);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Captura progresiva de lead (/lead).
    // ─────────────────────────────────────────────────────────────────────────
    public async Task CaptureLeadAsync(Conversation conv, LeadRequest body, CancellationToken ct = default)
    {
        await UpsertLeadAsync(conv,
            body.Name, body.Email, body.Phone, body.Company, body.CompanySize,
            body.Message, body.Intent, reason: "lead_form", consent: body.Consent);
        conv.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private async Task UpsertLeadAsync(
        Conversation conv, string? name, string? email, string? phone, string? company,
        string? companySize, string? message, string? intent, string? reason, bool consent)
    {
        var lead = await _db.Leads.FirstOrDefaultAsync(l => l.ConversationId == conv.Id);
        if (lead == null)
        {
            lead = new Lead { ConversationId = conv.Id, Source = "chatbot-web", CreadoEn = DateTime.UtcNow };
            _db.Leads.Add(lead);
        }

        lead.Reason ??= reason;
        if (!string.IsNullOrWhiteSpace(intent)) lead.Intent = intent;

        // LFPDPPP: solo persistir PII si el visitante dio consentimiento.
        if (consent)
        {
            if (!string.IsNullOrWhiteSpace(name)) lead.Name = name;
            if (!string.IsNullOrWhiteSpace(email)) lead.Email = email;
            if (!string.IsNullOrWhiteSpace(phone)) lead.Phone = phone;
            if (!string.IsNullOrWhiteSpace(company)) lead.Company = company;
            if (!string.IsNullOrWhiteSpace(companySize)) lead.CompanySize = companySize;
            if (!string.IsNullOrWhiteSpace(message)) lead.Message = message;
            if (!lead.Consent) { lead.Consent = true; lead.ConsentAt = DateTime.UtcNow; }
        }

        lead.ActualizadoEn = DateTime.UtcNow;
    }

    private async Task<List<KbHit>> SearchKbAsync(string query, CancellationToken ct)
    {
        var vec = await _ai.EmbedAsync(query, ct);
        if (vec == null) return new List<KbHit>();

        // Columnas en snake_case: el ChatDbContext usa UseSnakeCaseNamingConvention,
        // que tambien aplica al mapeo de SqlQueryRaw (propiedad ChunkText -> columna chunk_text).
        var rows = await _db.Database.SqlQueryRaw<KbHitRow>(@"
            SELECT d.slug, d.title, e.chunk_text,
                   1 - (e.embedding <=> {0}::vector) AS score
            FROM kb_embeddings e
            JOIN kb_documents d ON d.id = e.document_id
            WHERE d.activo = true
              AND 1 - (e.embedding <=> {0}::vector) >= {1}
            ORDER BY e.embedding <=> {0}::vector
            LIMIT {2}", vec, MinScore, TopK).ToListAsync(ct);

        return rows.Select(r => new KbHit(r.Slug, r.Title, r.ChunkText, r.Score)).ToList();
    }

    private string BuildSystemPrompt(IReadOnlyList<KbHit> hits)
    {
        var basePrompt = _cfg["Ai:PublicSystemPrompt"]
            ?? "Eres el asistente publico de Handy Suites. Responde solo sobre el producto, funciones y precios.";

        if (hits.Count == 0)
        {
            return basePrompt +
                "\n\nNo hay contexto de la base de conocimiento para esta pregunta. " +
                "Si no puedes responder con seguridad general sobre el producto, ofrece pasar con un asesor; " +
                "no inventes datos, precios ni funciones.";
        }

        var ctx = string.Join("\n\n", hits.Select((h, i) => $"[{i + 1}] ({h.Slug} - {h.Title})\n{h.ChunkText}"));
        return basePrompt +
            "\n\nUsa EXCLUSIVAMENTE el siguiente CONTEXTO para responder. Si el contexto no contiene la respuesta, " +
            "dilo con honestidad y ofrece un asesor; nunca inventes precios ni funciones. Responde breve y claro.\n\n" +
            "CONTEXTO:\n" + ctx;
    }

    private async Task<List<ChatTurn>> BuildHistoryAsync(int conversationId, CancellationToken ct)
    {
        var recent = await _db.Messages
            .Where(m => m.ConversationId == conversationId &&
                        (m.Role == MessageRole.Visitor || m.Role == MessageRole.Bot || m.Role == MessageRole.Agent))
            .OrderByDescending(m => m.Id)
            .Take(HistoryTurns)
            .ToListAsync(ct);

        recent.Reverse();
        // Redacta PII del historial antes de mandarlo al modelo.
        return recent
            .Select(m => new ChatTurn(m.Role == MessageRole.Visitor ? "user" : "assistant", PiiRedactor.Redact(m.Content)))
            .ToList();
    }

    /// <summary>Trozos de ~28 chars preservando todos los caracteres (incluye saltos de linea).</summary>
    private static IEnumerable<string> ChunkForTyping(string text)
    {
        const int size = 28;
        for (var i = 0; i < text.Length; i += size)
            yield return text.Substring(i, Math.Min(size, text.Length - i));
    }

    private static string Truncate(string s, int max)
        => string.IsNullOrEmpty(s) || s.Length <= max ? s : s[..max].TrimEnd() + "...";

    private class KbHitRow
    {
        public string Slug { get; set; } = "";
        public string Title { get; set; } = "";
        public string ChunkText { get; set; } = "";
        public double Score { get; set; }
    }
}
