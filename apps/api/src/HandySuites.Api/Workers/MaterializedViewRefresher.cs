using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Workers;

/// <summary>
/// Background worker that refreshes materialized views every 15 minutes.
/// Keeps report queries fast (&lt;100ms) by pre-computing aggregations.
/// Views: mv_ventas_diarias, mv_ventas_vendedor, mv_ventas_producto,
/// mv_ventas_zona, mv_actividad_clientes, mv_inventario_resumen,
/// mv_cartera_vencida, mv_kpis_dashboard + AI views.
/// </summary>
public class MaterializedViewRefresher : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<MaterializedViewRefresher> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);

    public MaterializedViewRefresher(IServiceProvider services, ILogger<MaterializedViewRefresher> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait 60 seconds after startup to let the app initialize
        await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

                _logger.LogInformation("Refreshing materialized views...");
                var sw = System.Diagnostics.Stopwatch.StartNew();

                await db.Database.ExecuteSqlRawAsync(
                    "SELECT refresh_report_materialized_views()", stoppingToken);
                await db.Database.ExecuteSqlRawAsync(
                    "SELECT refresh_ai_materialized_views()", stoppingToken);

                sw.Stop();
                _logger.LogInformation("Materialized views refreshed in {ElapsedMs}ms", sw.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing materialized views");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
