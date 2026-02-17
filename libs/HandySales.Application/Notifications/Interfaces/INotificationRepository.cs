using HandySales.Application.Notifications.DTOs;
using HandySales.Domain.Entities;

namespace HandySales.Application.Notifications.Interfaces;

public interface INotificationRepository
{
    /// <summary>
    /// Crear registro de notificación
    /// </summary>
    Task<NotificationHistory> CrearAsync(NotificationHistory notification);

    /// <summary>
    /// Actualizar estado de notificación
    /// </summary>
    Task<bool> ActualizarEstadoAsync(int id, NotificationStatus status, string? fcmMessageId = null, string? errorMessage = null);

    /// <summary>
    /// Obtener notificaciones del usuario con paginación
    /// </summary>
    Task<NotificationPaginatedResult> ObtenerPorUsuarioAsync(int usuarioId, int tenantId, NotificationFiltroDto filtro);

    /// <summary>
    /// Marcar como leída
    /// </summary>
    Task<bool> MarcarComoLeidaAsync(int id, int usuarioId, int tenantId);

    /// <summary>
    /// Marcar todas como leídas
    /// </summary>
    Task<int> MarcarTodasComoLeidasAsync(int usuarioId, int tenantId);

    /// <summary>
    /// Obtener conteo de no leídas
    /// </summary>
    Task<int> ObtenerConteoNoLeidasAsync(int usuarioId, int tenantId);

    /// <summary>
    /// Eliminar notificación
    /// </summary>
    Task<bool> EliminarAsync(int id, int usuarioId, int tenantId);

    /// <summary>
    /// Obtener push tokens activos para usuarios específicos
    /// </summary>
    Task<List<(int UsuarioId, int SessionId, string PushToken)>> ObtenerPushTokensAsync(int tenantId, List<int>? usuarioIds = null);

    /// <summary>
    /// Obtener push tokens de vendedores por zona
    /// </summary>
    Task<List<(int UsuarioId, int SessionId, string PushToken)>> ObtenerPushTokensVendedoresPorZonaAsync(int tenantId, int? zonaId);
}
