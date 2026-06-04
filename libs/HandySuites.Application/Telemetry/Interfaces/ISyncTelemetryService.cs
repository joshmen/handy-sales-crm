using HandySuites.Application.Telemetry.DTOs;

namespace HandySuites.Application.Telemetry.Interfaces;

public interface ISyncTelemetryService
{
    /// <summary>
    /// Persiste un heartbeat del cliente mobile. El tenant_id + usuario_id se
    /// toman SIEMPRE del JWT (ICurrentTenant) — el DTO solo trae datos del
    /// cliente que no pueden ser sensitive. ReceivedAt + IP se asignan server-side.
    /// </summary>
    Task<HeartbeatAckDto> SaveHeartbeatAsync(HeartbeatDto dto, string? ipAddress);

    /// <summary>
    /// Query del admin dashboard. Retorna vendedores con backlog: aquellos cuya
    /// ÚLTIMA telemetría tiene TotalPendingCount >= minPendingThreshold y se
    /// recibió hace >= minStaleMinutes (probable que esté stuck).
    ///
    /// Filtra al tenant del caller (admin/supervisor solo ve a sus vendedores).
    /// SUPER_ADMIN puede pasar todAllTenants=true para ver todos.
    /// </summary>
    Task<SyncHealthResponseDto> GetSyncHealthAsync(
        int minPendingThreshold,
        int minStaleMinutes,
        bool allTenants);

    /// <summary>
    /// Job de cleanup mensual. Borra rows con ReceivedAt < cutoffDate.
    /// Retorna cantidad de rows eliminadas.
    /// </summary>
    Task<int> PurgeOldHeartbeatsAsync(DateTime cutoffDate);
}
