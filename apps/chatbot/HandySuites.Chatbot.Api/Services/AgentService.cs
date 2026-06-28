using HandySuites.Chatbot.Api.Data;
using HandySuites.Chatbot.Api.Dtos;
using HandySuites.Chatbot.Api.Hubs;
using HandySuites.Chatbot.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Chatbot.Api.Services;

/// <summary>
/// Logica de la bandeja del agente (consola SA): listar, tomar, responder, cerrar.
/// Tomar/responder ponen mode=human con TTL deslizante (silencio del bot) y empujan al visitante por SSE.
/// </summary>
public class AgentService
{
    public const int HumanTtlHours = 2;
    private const int ListLimit = 100;

    private readonly ChatDbContext _db;
    private readonly ConversationStreamRegistry _reg;
    private readonly IHubContext<InboxHub> _hub;
    private readonly ILogger<AgentService> _log;

    public AgentService(ChatDbContext db, ConversationStreamRegistry reg, IHubContext<InboxHub> hub, ILogger<AgentService> log)
    {
        _db = db;
        _reg = reg;
        _hub = hub;
        _log = log;
    }

    public async Task<InboxListResponse> ListAsync(string? tab, CancellationToken ct)
    {
        var baseQ = _db.Conversations.AsNoTracking();

        var counts = new InboxCounts(
            Waiting: await baseQ.CountAsync(c => c.Status == ConversationStatus.Waiting, ct),
            Active: await baseQ.CountAsync(c => c.Status == ConversationStatus.Active, ct),
            Closed: await baseQ.CountAsync(c => c.Status == ConversationStatus.Closed, ct),
            All: await baseQ.CountAsync(c => c.Status != ConversationStatus.Closed, ct));

        var todayStart = DateTime.UtcNow.Date;
        var hoy = await baseQ.CountAsync(c => c.CreadoEn >= todayStart, ct);
        var resolved = await baseQ.CountAsync(c => c.ResolvedByBot && c.CreadoEn >= todayStart, ct);
        var kpis = new InboxKpis(
            Hoy: hoy,
            Esperan: counts.Waiting,
            Activas: counts.Active,
            ResueltasBotPct: hoy > 0 ? (int)Math.Round(100.0 * resolved / hoy) : 0);

        IQueryable<Conversation> q = baseQ;
        q = tab switch
        {
            "waiting" => q.Where(c => c.Status == ConversationStatus.Waiting),
            "active" => q.Where(c => c.Status == ConversationStatus.Active),
            "closed" => q.Where(c => c.Status == ConversationStatus.Closed),
            _ => q.Where(c => c.Status != ConversationStatus.Closed)
        };

        var rows = await q
            .OrderByDescending(c => c.ActualizadoEn ?? c.CreadoEn)
            .Take(ListLimit)
            .Select(c => new
            {
                c.Id, c.PublicId, c.Status, c.Mode, c.Taken, c.VisitorName,
                c.OriginPage, c.Device, c.Location, c.UnreadForAgent, c.LastVisitorAt, c.CreadoEn,
                Last = c.Messages.OrderByDescending(m => m.Id).Select(m => m.Content).FirstOrDefault(),
                HasLead = _db.Leads.Any(l => l.ConversationId == c.Id)
            })
            .ToListAsync(ct);

        var items = rows.Select(c => new InboxItem(
            c.Id, c.PublicId, StatusStr(c.Status), ModeStr(c.Mode), c.Taken, c.VisitorName,
            c.OriginPage, c.Device, c.Location, c.UnreadForAgent, c.Last, c.LastVisitorAt, c.CreadoEn, c.HasLead)).ToList();

        return new InboxListResponse(items, counts, kpis);
    }

    public async Task<ThreadResponse?> GetThreadAsync(int id, CancellationToken ct)
    {
        var c = await _db.Conversations
            .Include(x => x.Messages.OrderBy(m => m.Id))
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;

        var lead = await _db.Leads.AsNoTracking().FirstOrDefaultAsync(l => l.ConversationId == id, ct);

        return new ThreadResponse(
            c.Id, c.PublicId, StatusStr(c.Status), ModeStr(c.Mode), c.Taken, c.AssignedAgentId,
            c.VisitorName, c.VisitorEmail, c.OriginPage, c.Device, c.Location, c.CreadoEn,
            c.Messages.Select(m => new ThreadMessage(m.Id, RoleStr(m.Role), m.Content, m.CreadoEn, m.Confidence, m.AgentId)).ToList(),
            lead is null ? null : new InboxLead(lead.Name, lead.Email, lead.Phone, lead.Company, lead.CompanySize, lead.Intent, lead.Reason, lead.Consent));
    }

    public async Task<ThreadResponse?> TakeAsync(int id, string agentId, CancellationToken ct)
    {
        var c = await _db.Conversations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;
        if (c.Status == ConversationStatus.Closed) return await GetThreadAsync(id, ct);

        var now = DateTime.UtcNow;
        c.Status = ConversationStatus.Active;
        c.Taken = true;
        c.AssignedAgentId = agentId;
        c.Mode = ConversationMode.Human;
        c.ModeExpiresAt = now.AddHours(HumanTtlHours);
        c.UnreadForAgent = 0;
        c.LastAgentAt = now;
        c.ActualizadoEn = now;
        _db.Messages.Add(new ChatMessage
        {
            ConversationId = id, Role = MessageRole.System, AgentId = agentId,
            Content = "Un asesor se unio a la conversacion.", CreadoEn = now
        });
        await _db.SaveChangesAsync(ct);

        _reg.Publish(id, new VisitorEvent("system", "Un asesor se unio a la conversacion."));
        await _hub.Clients.Group("agents").SendAsync("InboxTaken", new { conversationId = id, agentId }, ct);

        return await GetThreadAsync(id, ct);
    }

    public async Task<bool> SendAsync(int id, string agentId, string text, CancellationToken ct)
    {
        text = (text ?? string.Empty).Trim();
        if (text.Length == 0) return false;

        var c = await _db.Conversations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null || c.Status == ConversationStatus.Closed) return false;

        var now = DateTime.UtcNow;
        _db.Messages.Add(new ChatMessage
        {
            ConversationId = id, Role = MessageRole.Agent, AgentId = agentId, Content = text, CreadoEn = now
        });
        c.LastAgentAt = now;
        c.ActualizadoEn = now;
        c.Mode = ConversationMode.Human;
        c.ModeExpiresAt = now.AddHours(HumanTtlHours); // refresca TTL en cada respuesta
        if (c.Status == ConversationStatus.Waiting)
        {
            c.Status = ConversationStatus.Active;
            c.Taken = true;
            c.AssignedAgentId ??= agentId;
        }
        await _db.SaveChangesAsync(ct);

        _reg.Publish(id, new VisitorEvent("agent_message", text));
        await _hub.Clients.Group($"conv:{id}").SendAsync("AgentMessage", new { conversationId = id, text, at = now }, ct);
        return true;
    }

    public async Task<bool> CloseAsync(int id, string agentId, CancellationToken ct)
    {
        var c = await _db.Conversations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return false;

        var now = DateTime.UtcNow;
        c.Status = ConversationStatus.Closed;
        c.Mode = ConversationMode.Bot;
        c.ModeExpiresAt = null;
        c.CerradoEn = now;
        c.ActualizadoEn = now;
        _db.Messages.Add(new ChatMessage
        {
            ConversationId = id, Role = MessageRole.System, AgentId = agentId,
            Content = "La conversacion fue cerrada por el asesor.", CreadoEn = now
        });
        await _db.SaveChangesAsync(ct);

        _reg.Publish(id, new VisitorEvent("closed", "La conversacion se cerro."));
        await _hub.Clients.Group("agents").SendAsync("InboxClosed", new { conversationId = id }, ct);
        return true;
    }

    public Task<int> WaitingCountAsync(CancellationToken ct)
        => _db.Conversations.CountAsync(c => c.Status == ConversationStatus.Waiting, ct);

    // ── mapeo enum -> string para el frontend ──
    internal static string StatusStr(ConversationStatus s) => s switch
    {
        ConversationStatus.Waiting => "waiting",
        ConversationStatus.Bot => "bot",
        ConversationStatus.Active => "active",
        ConversationStatus.Closed => "closed",
        _ => "bot"
    };

    internal static string ModeStr(ConversationMode m) => m == ConversationMode.Human ? "human" : "bot";

    internal static string RoleStr(MessageRole r) => r switch
    {
        MessageRole.Visitor => "visitor",
        MessageRole.Bot => "bot",
        MessageRole.Agent => "agent",
        MessageRole.System => "system",
        _ => "system"
    };
}
