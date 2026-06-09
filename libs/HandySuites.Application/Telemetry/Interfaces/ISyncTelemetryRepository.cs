using HandySuites.Domain.Entities;

namespace HandySuites.Application.Telemetry.Interfaces;

/// <summary>
/// Repo de persistencia para B.2 telemetría. Implementación en Infrastructure
/// porque depende de HandySuitesDbContext.
/// </summary>
public interface ISyncTelemetryRepository
{
    Task<long> AddHeartbeatAsync(MobileSyncTelemetry entity);

    /// <summary>
    /// Para cada (tenant_id, usuario_id), retorna el ÚLTIMO heartbeat cuyo
    /// TotalPendingCount >= minPending Y ReceivedAt <= staleThreshold.
    /// Si bypassTenantFilter=true (solo SuperAdmin), incluye todos los tenants.
    /// Acompaña con nombres de usuario (lookup en Usuarios).
    /// </summary>
    Task<List<(MobileSyncTelemetry Telemetry, string UsuarioNombre)>> GetBackloggedUsersAsync(
        int minPending,
        DateTime staleThreshold,
        bool bypassTenantFilter);

    Task<int> PurgeOlderThanAsync(DateTime cutoffDate);
}
