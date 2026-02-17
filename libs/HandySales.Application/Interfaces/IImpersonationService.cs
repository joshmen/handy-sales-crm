using HandySales.Application.DTOs;

namespace HandySales.Application.Interfaces;

/// <summary>
/// Servicio para gestión de impersonación de tenants.
/// Implementa auditoría completa y controles de seguridad.
/// </summary>
public interface IImpersonationService
{
    /// <summary>
    /// Inicia una sesión de impersonación.
    /// Solo disponible para SUPER_ADMIN.
    /// </summary>
    Task<StartImpersonationResponse> StartSessionAsync(
        StartImpersonationRequest request,
        int superAdminId,
        string ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Termina una sesión de impersonación activa.
    /// </summary>
    Task EndSessionAsync(
        Guid sessionId,
        int superAdminId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Registra una acción realizada durante la impersonación.
    /// </summary>
    Task LogActionAsync(
        LogImpersonationActionRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene el estado actual de impersonación del usuario.
    /// </summary>
    Task<CurrentImpersonationState> GetCurrentStateAsync(
        int superAdminId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Valida si una sesión de impersonación es válida y activa.
    /// </summary>
    Task<bool> ValidateSessionAsync(
        Guid sessionId,
        int superAdminId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene el historial de sesiones de impersonación.
    /// </summary>
    Task<ImpersonationHistoryResponse> GetHistoryAsync(
        ImpersonationHistoryFilter filter,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene los detalles de una sesión específica.
    /// </summary>
    Task<ImpersonationSessionDto?> GetSessionDetailsAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Expira sesiones que han superado su tiempo límite.
    /// Debe ejecutarse periódicamente (job).
    /// </summary>
    Task ExpireOldSessionsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Envía notificación al tenant sobre el acceso (si no se ha enviado).
    /// </summary>
    Task SendNotificationAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default);
}
