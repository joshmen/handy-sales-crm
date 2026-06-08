using HandySuites.Domain.Notifications;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.BackgroundServices;

/// <summary>
/// H-2 Outbox retention job (item 5.3) — periodically purges terminal
/// <see cref="NotificationOutbox"/> rows (`Sent` or `Failed`) whose
/// <see cref="NotificationOutbox.ProcessedAt"/> is older than 30 days so the
/// `notification_outbox` table does not grow unbounded.
///
/// Lifecycle notes:
///   - First tick is delayed by 1 hour so the host can finish startup before
///     a (potentially large) DELETE runs. This avoids piling work on top of
///     EF Core migration apply, cache warmup, etc.
///   - Subsequent ticks run every 24h.
///   - Deletion is done via <c>ExecuteDeleteAsync</c> so the whole purge is a
///     single atomic SQL statement (no entity tracking, no SaveChanges).
///   - All exceptions are caught and logged; the loop never terminates from a
///     transient DB error — it just waits for the next tick.
/// </summary>
public class OutboxRetentionService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<OutboxRetentionService> _logger;

    private static readonly TimeSpan InitialDelay = TimeSpan.FromHours(1);
    private static readonly TimeSpan TickInterval = TimeSpan.FromHours(24);
    private static readonly TimeSpan RetentionWindow = TimeSpan.FromDays(30);

    public OutboxRetentionService(
        IServiceProvider services,
        ILogger<OutboxRetentionService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "OutboxRetentionService started (initial delay: {InitialDelay}, tick: {Interval}, window: {Window})",
            InitialDelay, TickInterval, RetentionWindow);

        // CAUTION: do NOT run on process start — wait one hour so we don't
        // pile a heavy DELETE on top of startup/migration work.
        try
        {
            await Task.Delay(InitialDelay, stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PurgeOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "OutboxRetentionService tick failed; will retry on next interval");
            }

            try
            {
                await Task.Delay(TickInterval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task PurgeOnceAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

        var cutoff = DateTime.UtcNow - RetentionWindow;

        var deleted = await db.NotificationOutbox
            .Where(o => (o.Status == OutboxStatus.Sent || o.Status == OutboxStatus.Failed)
                        && o.ProcessedAt != null
                        && o.ProcessedAt < cutoff)
            .ExecuteDeleteAsync(ct);

        _logger.LogInformation(
            "OutboxRetentionService deleted {Count} terminal rows older than {Cutoff:O}",
            deleted, cutoff);
    }
}
