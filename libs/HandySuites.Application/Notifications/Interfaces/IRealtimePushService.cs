namespace HandySuites.Application.Notifications.Interfaces;

/// <summary>
/// Abstraction for real-time push delivery (SignalR, WebSockets, etc.)
/// Allows NotificationService to push notifications without depending on SignalR directly.
/// </summary>
public interface IRealtimePushService
{
    Task SendToUserAsync(int userId, object payload);
    Task SendToUsersAsync(IEnumerable<int> userIds, object payload);

    /// <summary>
    /// Emite un evento SignalR específico (event name custom) a un usuario.
    /// Útil para eventos distintos del genérico "ReceiveNotification" —
    /// ej. "RutaAssigned" para que el cliente mobile dispare un sync de
    /// WatermelonDB y la pantalla "Hoy" actualice sin pull.
    /// </summary>
    Task SendEventToUserAsync(int userId, string eventName, object payload);
}
