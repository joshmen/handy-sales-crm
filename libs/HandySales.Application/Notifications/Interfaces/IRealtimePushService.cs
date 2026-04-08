namespace HandySuites.Application.Notifications.Interfaces;

/// <summary>
/// Abstraction for real-time push delivery (SignalR, WebSockets, etc.)
/// Allows NotificationService to push notifications without depending on SignalR directly.
/// </summary>
public interface IRealtimePushService
{
    Task SendToUserAsync(int userId, object payload);
    Task SendToUsersAsync(IEnumerable<int> userIds, object payload);
}
