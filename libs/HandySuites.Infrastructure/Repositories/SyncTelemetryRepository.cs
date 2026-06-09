using HandySuites.Application.Telemetry.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories;

/// <summary>
/// B.2 — Persistencia de telemetría sync (heartbeat + admin dashboard query).
/// </summary>
public class SyncTelemetryRepository : ISyncTelemetryRepository
{
    private readonly HandySuitesDbContext _db;

    public SyncTelemetryRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<long> AddHeartbeatAsync(MobileSyncTelemetry entity)
    {
        _db.MobileSyncTelemetry.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<List<(MobileSyncTelemetry Telemetry, string UsuarioNombre)>> GetBackloggedUsersAsync(
        int minPending,
        DateTime staleThreshold,
        bool bypassTenantFilter)
    {
        // Query strategy:
        // 1) Por cada (tenant_id, usuario_id), pick el id del último heartbeat
        //    (ordenado por ReceivedAt desc).
        // 2) Filtrar esos rows por minPending + staleThreshold.
        // 3) Join con Usuarios para nombre.
        //
        // Ejecutado en 3 round-trips a DB. Optimización futura: si vuelve lento
        // con muchos usuarios, mover a un raw SQL con CTE o materializar todo
        // en memoria (no debería superar 1000 vendedores activos por tenant).
        var query = _db.MobileSyncTelemetry.AsNoTracking();
        if (bypassTenantFilter)
        {
            query = query.IgnoreQueryFilters();
        }

        var latestIds = await query
            .GroupBy(t => new { t.TenantId, t.UsuarioId })
            .Select(g => g.OrderByDescending(t => t.ReceivedAt).First().Id)
            .ToListAsync();

        if (latestIds.Count == 0)
        {
            return new();
        }

        var telemetryRows = await _db.MobileSyncTelemetry.AsNoTracking()
            .IgnoreQueryFilters() // ya filtramos arriba
            .Where(t => latestIds.Contains(t.Id))
            .Where(t => t.TotalPendingCount >= minPending)
            .Where(t => t.ReceivedAt <= staleThreshold)
            .ToListAsync();

        if (telemetryRows.Count == 0)
        {
            return new();
        }

        var userIds = telemetryRows.Select(r => r.UsuarioId).Distinct().ToList();
        var usuariosQuery = _db.Usuarios.AsNoTracking();
        if (bypassTenantFilter)
        {
            usuariosQuery = usuariosQuery.IgnoreQueryFilters();
        }
        var usuariosDict = await usuariosQuery
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Nombre);

        return telemetryRows
            .Select(t => (t, usuariosDict.GetValueOrDefault(t.UsuarioId, "<desconocido>")))
            .ToList();
    }

    public Task<int> PurgeOlderThanAsync(DateTime cutoffDate)
    {
        return _db.MobileSyncTelemetry
            .Where(t => t.ReceivedAt < cutoffDate)
            .ExecuteDeleteAsync();
    }
}
