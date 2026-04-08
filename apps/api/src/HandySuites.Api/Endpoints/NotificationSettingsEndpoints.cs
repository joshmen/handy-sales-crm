using HandySuites.Application.Notifications.DTOs;
using HandySuites.Infrastructure.Notifications.Services;
using HandySuites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class NotificationSettingsEndpoints
{
    public static void MapNotificationSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notification-settings")
            .RequireAuthorization()
            .WithTags("Notification Settings")
            .WithOpenApi();

        group.MapGet("/", async (
            [FromServices] NotificationSettingsService service,
            [FromServices] ITenantContextService tenant) =>
        {
            var tenantId = tenant.TenantId ?? 0;
            if (tenantId <= 0) return Results.Unauthorized();
            var settings = await service.GetAsync(tenantId);
            return Results.Ok(settings);
        })
        .WithSummary("Get tenant notification settings");

        group.MapPut("/", async (
            [FromBody] NotificationSettingsDto dto,
            [FromServices] NotificationSettingsService service,
            [FromServices] ITenantContextService tenant) =>
        {
            var tenantId = tenant.TenantId ?? 0;
            if (tenantId <= 0) return Results.Unauthorized();
            await service.SaveAsync(tenantId, dto);
            return Results.Ok(new { success = true, message = "Configuración de notificaciones guardada" });
        })
        .WithSummary("Update tenant notification settings");
    }
}
