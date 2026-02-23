using HandySales.Mobile.Api.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileNotificationEndpoints
{
    public static void MapMobileNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/notifications")
            .WithTags("Notifications")
            .WithOpenApi()
            .RequireAuthorization();

        // Send push to a specific user
        group.MapPost("/send", async (
            SendPushDto dto,
            [FromServices] PushNotificationService pushService,
            HttpContext context) =>
        {
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim))
                return Results.Unauthorized();

            var tenantId = int.Parse(tenantIdClaim);

            // Check caller is admin
            var isAdmin = context.User.FindFirst("es_admin")?.Value == "True"
                       || context.User.FindFirst("es_super_admin")?.Value == "True";
            if (!isAdmin)
                return Results.Forbid();

            var data = dto.Data ?? new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(dto.Type))
                data["type"] = dto.Type;

            PushResult result;
            if (dto.UserIds is { Count: > 0 })
            {
                result = await pushService.SendToUsersAsync(dto.UserIds, tenantId, dto.Title, dto.Body, data);
            }
            else if (dto.UserId.HasValue)
            {
                result = await pushService.SendToUserAsync(dto.UserId.Value, tenantId, dto.Title, dto.Body, data);
            }
            else
            {
                // Send to all in tenant
                result = await pushService.SendToTenantAsync(tenantId, dto.Title, dto.Body, data);
            }

            return Results.Ok(new { success = result.Success, deviceCount = result.DeviceCount, message = result.Message });
        })
        .WithSummary("Enviar notificación push")
        .WithDescription("Envía una notificación push a un usuario específico, múltiples usuarios, o a todos los vendedores del tenant. Requiere rol Admin.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status403Forbidden);

        // Send a test push to yourself
        group.MapPost("/test", async (
            TestPushDto dto,
            [FromServices] PushNotificationService pushService,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tenantIdClaim))
                return Results.Unauthorized();

            var userId = int.Parse(userIdClaim);
            var tenantId = int.Parse(tenantIdClaim);

            var result = await pushService.SendToUserAsync(
                userId, tenantId,
                dto.Title ?? "Prueba de notificación",
                dto.Body ?? "Si ves esto, las notificaciones push funcionan correctamente.");

            return Results.Ok(new { success = result.Success, deviceCount = result.DeviceCount, message = result.Message });
        })
        .WithSummary("Enviar push de prueba")
        .WithDescription("Envía una notificación push de prueba al dispositivo del usuario autenticado.")
        .Produces<object>(StatusCodes.Status200OK);
    }
}

public record SendPushDto(
    string Title,
    string Body,
    int? UserId = null,
    List<int>? UserIds = null,
    string? Type = null,
    Dictionary<string, string>? Data = null
);

public record TestPushDto(string? Title = null, string? Body = null);
