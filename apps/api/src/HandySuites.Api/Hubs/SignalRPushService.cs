using HandySuites.Application.Notifications.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Hubs;

/// <summary>
/// SignalR implementation of IRealtimePushService.
/// Pushes notifications to connected clients via the NotificationHub.
/// </summary>
public class SignalRPushService : IRealtimePushService
{
    private readonly IHubContext<NotificationHub> _hub;

    public SignalRPushService(IHubContext<NotificationHub> hub) => _hub = hub;

    public Task SendToUserAsync(int userId, object payload)
        => _hub.Clients.Group($"user:{userId}").SendAsync("ReceiveNotification", payload);

    public async Task SendToUsersAsync(IEnumerable<int> userIds, object payload)
    {
        var tasks = userIds.Select(uid =>
            _hub.Clients.Group($"user:{uid}").SendAsync("ReceiveNotification", payload));
        await Task.WhenAll(tasks);
    }

    public Task SendEventToUserAsync(int userId, string eventName, object payload)
        => _hub.Clients.Group($"user:{userId}").SendAsync(eventName, payload);
}
