using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Services;

/// <summary>
/// Limpieza diaria de <see cref="NotificationHistory"/> con retención 30 días.
///
/// Patrón <see cref="BackgroundService"/> + <see cref="PeriodicTimer"/>
/// (estándar .NET 8). Run inicial 5 min después del startup para no
/// chocar con migrations del DbContext durante warm-up. Después corre
/// cada 24h.
///
/// Idempotent: solo borra registros con <c>EnviadoEn &lt; NOW() - 30d</c>.
/// El cap de 30 días está alineado con el endpoint
/// <c>GET /api/mobile/notifications</c> y con la retención de
/// <c>UbicacionesVendedor</c>.
/// </summary>
public class NotificationCleanupWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NotificationCleanupWorker> _logger;

    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
    private static readonly TimeSpan RetentionWindow = TimeSpan.FromDays(30);

    public NotificationCleanupWorker(
        IServiceProvider serviceProvider,
        ILogger<NotificationCleanupWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
        }
        catch (TaskCanceledException) { return; }

        using var timer = new PeriodicTimer(Interval);

        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "NotificationCleanupWorker run failed; will retry next interval");
            }
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    internal async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

        var cutoff = DateTime.UtcNow - RetentionWindow;

        // ExecuteDeleteAsync es la API EF Core 7+ para bulk delete sin
        // materializar la entidad. Postgres traduce a un único DELETE.
        var deleted = await db.NotificationHistory
            .IgnoreQueryFilters()
            .Where(nh => nh.EnviadoEn != null && nh.EnviadoEn < cutoff)
            .ExecuteDeleteAsync(cancellationToken);

        if (deleted > 0)
            _logger.LogInformation("NotificationCleanup deleted {Count} rows older than {Cutoff:o}", deleted, cutoff);
        else
            _logger.LogDebug("NotificationCleanup: nothing to delete (cutoff {Cutoff:o})", cutoff);
    }
}
