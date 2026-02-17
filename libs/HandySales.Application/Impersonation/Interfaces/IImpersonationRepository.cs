using HandySales.Domain.Entities;

namespace HandySales.Application.Impersonation.Interfaces;

/// <summary>
/// Repositorio para gestión de sesiones de impersonación.
/// Los registros son inmutables (solo inserción y lectura).
/// </summary>
public interface IImpersonationRepository
{
    /// <summary>
    /// Crea una nueva sesión de impersonación.
    /// </summary>
    Task<ImpersonationSession> CreateSessionAsync(ImpersonationSession session);

    /// <summary>
    /// Obtiene una sesión por ID.
    /// </summary>
    Task<ImpersonationSession?> GetByIdAsync(Guid sessionId);

    /// <summary>
    /// Obtiene la sesión activa de un SUPER_ADMIN (si existe).
    /// </summary>
    Task<ImpersonationSession?> GetActiveSessionForUserAsync(int superAdminId);

    /// <summary>
    /// Marca una sesión como finalizada.
    /// </summary>
    Task EndSessionAsync(Guid sessionId, DateTime endedAt);

    /// <summary>
    /// Marca sesiones expiradas.
    /// </summary>
    Task ExpireOldSessionsAsync();

    /// <summary>
    /// Agrega una acción al log de la sesión.
    /// </summary>
    Task LogActionAsync(Guid sessionId, string actionJson);

    /// <summary>
    /// Agrega una página visitada al log.
    /// </summary>
    Task LogPageVisitAsync(Guid sessionId, string path);

    /// <summary>
    /// Marca que se envió la notificación al tenant.
    /// </summary>
    Task MarkNotificationSentAsync(Guid sessionId);

    /// <summary>
    /// Obtiene el historial de sesiones con filtros.
    /// </summary>
    Task<(List<ImpersonationSession> Sessions, int TotalCount)> GetHistoryAsync(
        int? superAdminId,
        int? targetTenantId,
        DateTime? fromDate,
        DateTime? toDate,
        string? status,
        int page,
        int pageSize);

    /// <summary>
    /// Cuenta sesiones activas para un tenant.
    /// </summary>
    Task<int> CountActiveSessionsForTenantAsync(int tenantId);
}
