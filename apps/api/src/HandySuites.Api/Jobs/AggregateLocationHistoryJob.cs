using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Jobs;

/// <summary>
/// Job nocturno (03:00 UTC) que agrega filas de UbicacionesVendedor con
/// más de 30 días de antigüedad. Para cada hora del día, conserva 1 ping
/// representativo (el primero) y borra el resto.
///
/// Sin esto, una operación de 50 vendedores × 96 pings/día durante 1 año
/// generaría ~1.7M filas. Con agregación quedan ~432K (24×30 vs 96×30 por
/// día y vendedor) — una orden de magnitud menos.
///
/// Diseño: chequea cada hora si toca correr (>= 03:00 UTC y no corrió hoy).
/// Persiste el último run en memoria — si el proceso reinicia, puede
/// correr 2 veces el mismo día (idempotente, no afecta).
/// </summary>
public class AggregateLocationHistoryJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<AggregateLocationHistoryJob> _log;
    private DateOnly _lastRun = DateOnly.MinValue;

    public AggregateLocationHistoryJob(IServiceProvider services, ILogger<AggregateLocationHistoryJob> log)
    {
        _services = services;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Pequeña espera al startup para no bloquear health-check inicial
        try { await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken); } catch { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var nowUtc = DateTime.UtcNow;
                var today = DateOnly.FromDateTime(nowUtc);
                if (nowUtc.Hour >= 3 && _lastRun < today)
                {
                    await RunAggregationAsync(stoppingToken);
                    _lastRun = today;
                }
            }
            catch (OperationCanceledException) { return; }
            catch (Exception ex)
            {
                _log.LogError(ex, "AggregateLocationHistoryJob: unhandled exception in tick");
            }

            try { await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken); } catch { return; }
        }
    }

    private async Task RunAggregationAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

        var corte = DateTime.UtcNow.AddDays(-30);
        _log.LogInformation("AggregateLocationHistoryJob: aggregating UbicacionesVendedor older than {Corte:o}", corte);

        // Postgres: para cada (tenant, usuario, día, hora), conservar el primer
        // ping (MIN id) y borrar el resto. Single SQL para evitar N+1.
        var sql = @"
            DELETE FROM ""UbicacionesVendedor"" u
            WHERE u.capturado_en < @corte
              AND u.id NOT IN (
                SELECT MIN(u2.id)
                FROM ""UbicacionesVendedor"" u2
                WHERE u2.capturado_en < @corte
                GROUP BY u2.tenant_id, u2.usuario_id,
                         date_trunc('hour', u2.capturado_en)
              );";

        var deleted = await db.Database.ExecuteSqlRawAsync(
            sql,
            new[] { new Npgsql.NpgsqlParameter("@corte", corte) },
            ct);

        _log.LogInformation("AggregateLocationHistoryJob: deleted {Count} aggregated rows", deleted);
    }
}
