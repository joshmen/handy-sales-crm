using HandySuites.Chatbot.Api.Data;
using HandySuites.Chatbot.Api.Hubs;
using HandySuites.Chatbot.Api.Models;
using HandySuites.Chatbot.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Chatbot.Api.Workers;

/// <summary>
/// Barre periodicamente las conversaciones en modo human cuyo TTL vencio y reanuda el bot.
/// Fallback al chokepoint perezoso de ChatService (que tambien reanuda al recibir un mensaje).
/// </summary>
public class BotResumeWorker : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ConversationStreamRegistry _reg;
    private readonly IHubContext<InboxHub> _hub;
    private readonly ILogger<BotResumeWorker> _log;

    public BotResumeWorker(
        IServiceScopeFactory scopeFactory, ConversationStreamRegistry reg,
        IHubContext<InboxHub> hub, ILogger<BotResumeWorker> log)
    {
        _scopeFactory = scopeFactory;
        _reg = reg;
        _hub = hub;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ResumeExpiredAsync(stoppingToken); }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _log.LogError(ex, "Error en el barrido de auto-reanudacion del bot");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task ResumeExpiredAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ChatDbContext>();

        var now = DateTime.UtcNow;
        var expired = await db.Conversations
            .Where(c => c.Mode == ConversationMode.Human && c.ModeExpiresAt != null && c.ModeExpiresAt <= now)
            .ToListAsync(ct);
        if (expired.Count == 0) return;

        foreach (var c in expired)
        {
            c.Mode = ConversationMode.Bot;
            c.ModeExpiresAt = null;
            if (c.Status == ConversationStatus.Active) c.Status = ConversationStatus.Bot;
            c.ActualizadoEn = now;
            db.Messages.Add(new ChatMessage
            {
                ConversationId = c.Id, Role = MessageRole.System,
                Content = "El asistente retoma la conversacion por inactividad del asesor.", CreadoEn = now
            });
        }
        await db.SaveChangesAsync(ct);

        foreach (var c in expired)
        {
            _reg.Publish(c.Id, new VisitorEvent("system", "El asistente retoma la conversacion."));
            await _hub.Clients.Group("agents").SendAsync("ConversationResumed", new { conversationId = c.Id }, ct);
        }

        _log.LogInformation("Auto-reanudacion: {Count} conversaciones volvieron al bot", expired.Count);
    }
}
