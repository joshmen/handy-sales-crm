using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Channels;
using HandySuites.Chatbot.Api.Data;
using HandySuites.Chatbot.Api.Dtos;
using HandySuites.Chatbot.Api.Models;
using HandySuites.Chatbot.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Chatbot.Api.Endpoints;

/// <summary>
/// Rutas del chatbot por zona: PUBLIC (sin JWT, rate-limited, CORS publico),
/// AGENT (JWT SUPER_ADMIN, stub hasta Fase 1c), INTERNAL (api key).
/// </summary>
public static class ChatbotEndpoints
{
    public static void MapChatbotEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", () => Results.Ok(new
        {
            status = "healthy",
            service = "HandySuites Chatbot",
            timestamp = DateTime.UtcNow
        })).WithName("Health");

        MapPublic(app);
        MapAgent(app);
        MapInternal(app);
    }

    // ── PUBLIC (visitante anonimo) ──
    private static void MapPublic(IEndpointRouteBuilder app)
    {
        var pub = app.MapGroup("/public/conversations")
            .RequireCors("ChatbotPublic")
            .RequireRateLimiting("chatbot-anonymous");

        // Iniciar conversacion.
        pub.MapPost("/", async (StartConversationRequest? body, ChatDbContext db, HttpContext ctx, CancellationToken ct) =>
        {
            var conv = new Conversation
            {
                VisitorId = Trunc(body?.VisitorId, 80),
                OriginPage = Trunc(body?.OriginPage, 300),
                Device = Trunc(ctx.Request.Headers.UserAgent.ToString(), 200),
                VisitorIp = TruncateIp(ctx.Connection.RemoteIpAddress),
                Status = ConversationStatus.Bot,
                Mode = ConversationMode.Bot,
                CreadoEn = DateTime.UtcNow
            };
            db.Conversations.Add(conv);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new StartConversationResponse(conv.PublicId, "bot"));
        });

        // Turno de chat RAG (SSE).
        pub.MapPost("/{publicId:guid}/chat", async (
            Guid publicId, ChatRequest? body, ChatService chat, ChatDbContext db, HttpContext ctx, CancellationToken ct) =>
        {
            if (body is null || string.IsNullOrWhiteSpace(body.Message))
                return Results.BadRequest(new { error = "message requerido" });

            var conv = await db.Conversations.FirstOrDefaultAsync(c => c.PublicId == publicId, ct);
            if (conv is null) return Results.NotFound();
            if (conv.Status == ConversationStatus.Closed)
                return Results.Conflict(new { error = "conversacion cerrada" });

            PrepareSse(ctx.Response);
            try
            {
                await foreach (var json in chat.StreamTurnAsync(conv, body.Message, ct))
                {
                    await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
                    await ctx.Response.Body.FlushAsync(ct);
                }
                await ctx.Response.WriteAsync("data: [DONE]\n\n", ct);
                await ctx.Response.Body.FlushAsync(ct);
            }
            catch (OperationCanceledException) { /* cliente desconecto */ }
            return Results.Empty;
        });

        // Canal de recepcion del visitante (SSE): mensajes del agente / sistema.
        pub.MapGet("/{publicId:guid}/stream", async (
            Guid publicId, ChatDbContext db, ConversationStreamRegistry reg, HttpContext ctx, CancellationToken ct) =>
        {
            var conv = await db.Conversations.FirstOrDefaultAsync(c => c.PublicId == publicId, ct);
            if (conv is null) return Results.NotFound();

            PrepareSse(ctx.Response);
            var (subId, reader) = reg.Subscribe(conv.Id);
            Task<VisitorEvent>? pending = null;
            try
            {
                await ctx.Response.WriteAsync(": connected\n\n", ct);
                await ctx.Response.Body.FlushAsync(ct);

                while (!ct.IsCancellationRequested)
                {
                    pending ??= reader.ReadAsync(ct).AsTask();
                    var completed = await Task.WhenAny(pending, Task.Delay(TimeSpan.FromSeconds(20), ct));
                    if (completed == pending)
                    {
                        VisitorEvent ev;
                        try { ev = await pending; }
                        catch (ChannelClosedException) { break; }
                        finally { pending = null; }

                        var json = ChatJson.S(new { type = ev.Type, text = ev.Text, confidence = ev.Confidence, sources = ev.Sources });
                        await ctx.Response.WriteAsync($"data: {json}\n\n", ct);
                    }
                    else
                    {
                        await ctx.Response.WriteAsync(": ping\n\n", ct);
                    }
                    await ctx.Response.Body.FlushAsync(ct);
                }
            }
            catch (OperationCanceledException) { /* cliente desconecto */ }
            catch (IOException) { /* socket cerrado */ }
            finally { reg.Unsubscribe(conv.Id, subId); }
            return Results.Empty;
        });

        // Handoff a un asesor humano.
        pub.MapPost("/{publicId:guid}/handoff", async (
            Guid publicId, HandoffRequest? body, ChatService chat, ChatDbContext db, CancellationToken ct) =>
        {
            var conv = await db.Conversations.FirstOrDefaultAsync(c => c.PublicId == publicId, ct);
            if (conv is null) return Results.NotFound();
            await chat.RequestHandoffAsync(conv, body ?? new HandoffRequest(null, null), ct);
            return Results.Ok(new { status = "waiting" });
        });

        // Captura progresiva de lead.
        pub.MapPost("/{publicId:guid}/lead", async (
            Guid publicId, LeadRequest? body, ChatService chat, ChatDbContext db, CancellationToken ct) =>
        {
            if (body is null) return Results.BadRequest(new { error = "datos requeridos" });
            var conv = await db.Conversations.FirstOrDefaultAsync(c => c.PublicId == publicId, ct);
            if (conv is null) return Results.NotFound();
            await chat.CaptureLeadAsync(conv, body, ct);
            return Results.Ok(new { status = "ok" });
        });
    }

    // ── AGENT (consola SA, JWT SUPER_ADMIN) ──
    private static void MapAgent(IEndpointRouteBuilder app)
    {
        var agent = app.MapGroup("/agent")
            .RequireAuthorization(p => p.RequireRole("SUPER_ADMIN"))
            .RequireCors("ChatbotAgent");

        agent.MapGet("/conversations", async (string? tab, AgentService svc, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(tab, ct)));

        agent.MapGet("/conversations/{id:int}", async (int id, AgentService svc, CancellationToken ct) =>
            await svc.GetThreadAsync(id, ct) is { } thread ? Results.Ok(thread) : Results.NotFound());

        agent.MapPost("/conversations/{id:int}/take", async (int id, AgentService svc, HttpContext ctx, CancellationToken ct) =>
            await svc.TakeAsync(id, AgentId(ctx), ct) is { } thread ? Results.Ok(thread) : Results.NotFound());

        agent.MapPost("/conversations/{id:int}/messages", async (
            int id, AgentSendRequest? body, AgentService svc, HttpContext ctx, CancellationToken ct) =>
        {
            if (body is null || string.IsNullOrWhiteSpace(body.Message))
                return Results.BadRequest(new { error = "message requerido" });
            return await svc.SendAsync(id, AgentId(ctx), body.Message, ct)
                ? Results.Ok(new { status = "sent" })
                : Results.Conflict(new { error = "conversacion no disponible" });
        });

        agent.MapPost("/conversations/{id:int}/close", async (int id, AgentService svc, HttpContext ctx, CancellationToken ct) =>
            await svc.CloseAsync(id, AgentId(ctx), ct) ? Results.Ok(new { status = "closed" }) : Results.NotFound());

        agent.MapGet("/badges", async (AgentService svc, CancellationToken ct) =>
            Results.Ok(new BadgesResponse(await svc.WaitingCountAsync(ct))));
    }

    private static string AgentId(HttpContext ctx)
        => ctx.User.FindFirst("sub")?.Value
           ?? ctx.User.FindFirst("nameid")?.Value
           ?? ctx.User.Identity?.Name
           ?? "agent";

    // ── INTERNAL (carga de KB, api key en tiempo constante) ──
    private static void MapInternal(IEndpointRouteBuilder app)
    {
        app.MapPost("/kb/ingest", async (
            KbIngestRequest? body, HttpRequest req, IConfiguration cfg, KbIngestService ingest, CancellationToken ct) =>
        {
            var provided = req.Headers["X-Internal-Api-Key"].ToString();
            var expected = cfg["INTERNAL_API_KEY"] ?? Environment.GetEnvironmentVariable("INTERNAL_API_KEY");
            if (string.IsNullOrEmpty(provided) || string.IsNullOrEmpty(expected) || !FixedEquals(provided, expected))
                return Results.Unauthorized();
            if (body?.Documents is null || body.Documents.Count == 0)
                return Results.BadRequest(new { error = "documents requerido" });

            var result = await ingest.IngestAsync(body.Documents, ct);
            return Results.Ok(result);
        });
    }

    // ─────────────────────────────── helpers ───────────────────────────────
    private static void PrepareSse(HttpResponse res)
    {
        res.Headers.ContentType = "text/event-stream";
        res.Headers.CacheControl = "no-cache";
        res.Headers["X-Accel-Buffering"] = "no"; // desactiva buffering en proxies (nginx)
    }

    private static string? Trunc(string? s, int max)
        => string.IsNullOrWhiteSpace(s) ? null : (s.Length <= max ? s : s[..max]);

    /// <summary>Trunca la IP por LFPDPPP: enmascara el ultimo octeto (IPv4) o deja solo el prefijo (IPv6).</summary>
    private static string? TruncateIp(IPAddress? ip)
    {
        if (ip is null) return null;
        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var p = ip.ToString().Split('.');
            if (p.Length == 4) { p[3] = "0"; return string.Join('.', p); }
        }
        var s = ip.ToString();
        return s.Length > 16 ? s[..16] + "::" : s;
    }

    private static bool FixedEquals(string a, string b)
        => CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}
