using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HandySales.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        // IMPORTANT: Do NOT use ICurrentTenant here — it depends on IHttpContextAccessor
        // which is NULL during Hub method execution. Read claims directly from Context.User.
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? Context.User?.FindFirstValue("sub");
        var tenantId = Context.User?.FindFirstValue("tenant_id");

        if (userId == null || tenantId == null)
        {
            _logger.LogWarning("SignalR connection rejected: missing userId or tenantId claims");
            Context.Abort();
            return;
        }

        // Join tenant-wide group (for announcements, maintenance, broadcasts)
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant:{tenantId}");

        // Join user-specific group (for personal notifications)
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");

        _logger.LogInformation(
            "SignalR connected: userId={UserId}, tenantId={TenantId}, connId={ConnId}",
            userId, tenantId, Context.ConnectionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? Context.User?.FindFirstValue("sub");

        _logger.LogInformation(
            "SignalR disconnected: userId={UserId}, connId={ConnId}, reason={Reason}",
            userId, Context.ConnectionId, exception?.Message ?? "clean");

        await base.OnDisconnectedAsync(exception);
    }
}
