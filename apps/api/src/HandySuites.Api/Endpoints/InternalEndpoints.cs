using HandySuites.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

public static class InternalEndpoints
{
    public static void MapInternalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/internal")
            .WithTags("Internal")
            .ExcludeFromDescription(); // Hide from Swagger — internal use only

        // Sync notification — used by Mobile API to notify web clients via Main API's SignalR hub
        group.MapPost("/sync-notify", async (
            SyncNotifyRequest request,
            IHubContext<NotificationHub> hubContext,
            HandySuites.Infrastructure.Persistence.HandySuitesDbContext db,
            IConfiguration configuration,
            HttpContext context,
            ILogger<Program> logger) =>
        {
            // API key authentication (no JWT required — internal service-to-service call)
            var apiKey = context.Request.Headers["X-Internal-Api-Key"].FirstOrDefault();
            var expectedKey = configuration["InternalApiKey"] ?? throw new InvalidOperationException("InternalApiKey is not configured");
            if (string.IsNullOrEmpty(apiKey) || apiKey != expectedKey)
            {
                logger.LogWarning("sync-notify: Invalid or missing API key");
                return Results.Unauthorized();
            }

            var tenantExists = await db.Tenants.AsNoTracking().AnyAsync(t => t.Id == request.TenantId);
            if (!tenantExists)
            {
                logger.LogWarning("sync-notify: TenantId={TenantId} does not exist, rejecting broadcast", request.TenantId);
                return Results.BadRequest(new { message = "Tenant no encontrado" });
            }

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

        // Dashboard update — lightweight notification for pedido/cobro state changes from Mobile API
        group.MapPost("/dashboard-notify", async (
            DashboardNotifyRequest request,
            IHubContext<NotificationHub> hubContext,
            IConfiguration configuration,
            HttpContext context,
            ILogger<Program> logger) =>
        {
            // API key authentication (no JWT required — internal service-to-service call)
            var apiKey = context.Request.Headers["X-Internal-Api-Key"].FirstOrDefault();
            var expectedKey = configuration["InternalApiKey"] ?? throw new InvalidOperationException("InternalApiKey is not configured");
            if (string.IsNullOrEmpty(apiKey) || apiKey != expectedKey)
            {
                logger.LogWarning("dashboard-notify: Invalid or missing API key");
                return Results.Unauthorized();
            }

            if (request.TenantId <= 0)
                return Results.BadRequest(new { message = "TenantId invalido" });

            logger.LogInformation(
                "Dashboard notification: tenant={TenantId}, tipo={Tipo}, id={Id}",
                request.TenantId, request.Tipo, request.Id);

            var tenantGroup = $"tenant:{request.TenantId}";
            await hubContext.Clients.Group(tenantGroup).SendAsync("DashboardUpdate", new
            {
                tipo = request.Tipo,
                id = request.Id
            });

            return Results.Ok(new { success = true });
        });
    }
}

public class DashboardNotifyRequest
{
    public string Tipo { get; set; } = "";
    public int Id { get; set; }
    public int TenantId { get; set; }
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
