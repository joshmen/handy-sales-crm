using HandySuites.Chatbot.Api.Data;
using HandySuites.Chatbot.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Chatbot.Api.Workers;

/// <summary>
/// Purga conversaciones CERRADAS mas viejas que CHAT__RETENTION_DAYS (LFPDPPP: minimizar la
/// retencion de datos personales). Desactivado por defecto (0): el operador fija el periodo
/// segun su politica. Cascade borra los mensajes; los leads conservan su registro con
/// conversation_id = NULL (el lead es el dato de negocio con consentimiento).
/// </summary>
public class DataRetentionWorker : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _cfg;
    private readonly ILogger<DataRetentionWorker> _log;

    public DataRetentionWorker(IServiceScopeFactory scopeFactory, IConfiguration cfg, ILogger<DataRetentionWorker> log)
    {
        _scopeFactory = scopeFactory;
        _cfg = cfg;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await PurgeAsync(stoppingToken); }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _log.LogError(ex, "Error en el barrido de retencion de datos");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task PurgeAsync(CancellationToken ct)
    {
        var raw = _cfg["CHAT__RETENTION_DAYS"] ?? Environment.GetEnvironmentVariable("CHAT__RETENTION_DAYS");
        if (!int.TryParse(raw, out var days) || days <= 0) return; // desactivado

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ChatDbContext>();
        var cutoff = DateTime.UtcNow.AddDays(-days);

        var old = await db.Conversations
            .Where(c => c.Status == ConversationStatus.Closed
                        && (c.CerradoEn ?? c.ActualizadoEn ?? c.CreadoEn) < cutoff)
            .ToListAsync(ct);
        if (old.Count == 0) return;

        db.Conversations.RemoveRange(old);
        await db.SaveChangesAsync(ct);
        _log.LogInformation("Retencion: {Count} conversaciones cerradas (> {Days}d) purgadas", old.Count, days);
    }
}
