using HandySales.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace HandySales.Api.Endpoints;

public static class InternalEndpoints
{
    public static void MapInternalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/internal")
            .WithTags("Internal")
            .ExcludeFromDescription(); // Hide from Swagger — internal use only

        group.MapPost("/sync-notify", async (
            SyncNotifyRequest request,
            IHubContext<NotificationHub> hubContext,
            ILogger<Program> logger) =>
        {
            logger.LogInformation(
                "Sync notification: tenant={TenantId}, user={UserId} ({UserName}), pushed={TotalPushed}, pulled={TotalPulled}",
                request.TenantId, request.UserId, request.UserName,
                request.Summary.TotalPushed, request.Summary.TotalPulled);

            var tenantGroup = $"tenant:{request.TenantId}";

            // Broadcast SyncCompleted event to all admin web clients in this tenant
            await hubContext.Clients.Group(tenantGroup).SendAsync("SyncCompleted", new
            {
                userId = request.UserId,
                userName = request.UserName,
                pulled = request.Summary.TotalPulled,
                pushed = request.Summary.TotalPushed,
                pedidosCreados = request.Summary.PedidosCreados,
                cobrosCreados = request.Summary.CobrosCreados,
                visitasCreadas = request.Summary.VisitasCreadas,
                clientesCreados = request.Summary.ClientesCreados,
                timestamp = request.Timestamp ?? DateTime.UtcNow
            });

            // Emit granular events for specific data types
            if (request.Summary.PedidosCreados > 0)
            {
                await hubContext.Clients.Group(tenantGroup).SendAsync("PedidoCreated", new
                {
                    userId = request.UserId,
                    userName = request.UserName,
                    count = request.Summary.PedidosCreados,
                    timestamp = request.Timestamp ?? DateTime.UtcNow
                });
            }

            if (request.Summary.CobrosCreados > 0)
            {
                await hubContext.Clients.Group(tenantGroup).SendAsync("CobroRegistrado", new
                {
                    userId = request.UserId,
                    userName = request.UserName,
                    count = request.Summary.CobrosCreados,
                    timestamp = request.Timestamp ?? DateTime.UtcNow
                });
            }

            if (request.Summary.VisitasCreadas > 0)
            {
                await hubContext.Clients.Group(tenantGroup).SendAsync("VisitaCompletada", new
                {
                    userId = request.UserId,
                    userName = request.UserName,
                    count = request.Summary.VisitasCreadas,
                    timestamp = request.Timestamp ?? DateTime.UtcNow
                });
            }

            return Results.Ok(new { success = true });
        });
    }
}

public class SyncNotifyRequest
{
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = "";
    public SyncNotifySummary Summary { get; set; } = new();
    public DateTime? Timestamp { get; set; }
}

public class SyncNotifySummary
{
    public int PedidosCreados { get; set; }
    public int PedidosActualizados { get; set; }
    public int CobrosCreados { get; set; }
    public int VisitasCreadas { get; set; }
    public int ClientesCreados { get; set; }
    public int TotalPushed { get; set; }
    public int TotalPulled { get; set; }
}
