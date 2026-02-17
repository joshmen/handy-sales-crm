using HandySales.Application.Notifications.DTOs;

namespace HandySales.Application.Notifications.Interfaces;

public interface INotificationService
{
    /// <summary>
    /// Enviar notificación a un usuario específico
    /// </summary>
    Task<NotificationSendResultDto> EnviarNotificacionAsync(SendNotificationDto dto);

    /// <summary>
    /// Enviar notificación broadcast a múltiples usuarios
    /// </summary>
    Task<BroadcastResultDto> EnviarBroadcastAsync(BroadcastNotificationDto dto);

    /// <summary>
    /// Obtener notificaciones del usuario actual
    /// </summary>
    Task<NotificationPaginatedResult> ObtenerMisNotificacionesAsync(NotificationFiltroDto filtro);

    /// <summary>
    /// Marcar notificación como leída
    /// </summary>
    Task<bool> MarcarComoLeidaAsync(int notificationId);

    /// <summary>
    /// Marcar todas las notificaciones como leídas
    /// </summary>
    Task<int> MarcarTodasComoLeidasAsync();

    /// <summary>
    /// Obtener conteo de notificaciones no leídas
    /// </summary>
    Task<int> ObtenerConteoNoLeidasAsync();

    /// <summary>
    /// Eliminar notificación
    /// </summary>
    Task<bool> EliminarNotificacionAsync(int notificationId);

    /// <summary>
    /// Registrar push token para la sesión actual
    /// </summary>
    Task<bool> RegistrarPushTokenAsync(RegisterPushTokenDto dto);
}
