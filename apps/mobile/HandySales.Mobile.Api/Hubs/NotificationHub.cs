using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HandySales.Mobile.Api.Hubs;

[Authorize]
public class MobileNotificationHub : Hub
{
    private readonly ILogger<MobileNotificationHub> _logger;

    public MobileNotificationHub(ILogger<MobileNotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? Context.User?.FindFirstValue("sub");
        var tenantId = Context.User?.FindFirstValue("tenant_id");

        if (userId == null || tenantId == null)
        {
            _logger.LogWarning("SignalR connection rejected: missing userId or tenantId claims");
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant:{tenantId}");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");

        _logger.LogInformation(
            "Mobile SignalR connected: userId={UserId}, tenantId={TenantId}",
            userId, tenantId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? Context.User?.FindFirstValue("sub");

        _logger.LogInformation(
            "Mobile SignalR disconnected: userId={UserId}, reason={Reason}",
            userId, exception?.Message ?? "clean");

        await base.OnDisconnectedAsync(exception);
    }
}
