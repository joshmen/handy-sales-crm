using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

public static class InternalPushEndpoints
{
    public static void MapInternalPushEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/internal")
            .WithTags("Internal")
            .ExcludeFromDescription(); // Hide from Swagger — internal use only

        /// <summary>
        /// Receives push notification requests from the backoffice (Main API) and
        /// dispatches them to mobile devices via Expo Push API.
        /// Auth: X-Internal-Api-Key header (service-to-service, no JWT required).
        /// </summary>
        group.MapPost("/push-notify", async (
            InternalPushRequest request,
            [FromServices] PushNotificationService pushService,
            [FromServices] HandySuitesDbContext db,
            [FromServices] IConfiguration configuration,
            HttpContext context,
            [FromServices] ILogger<Program> logger) =>
        {
            // API key authentication (same pattern as Main API internal endpoints)
            var apiKey = context.Request.Headers["X-Internal-Api-Key"].FirstOrDefault();
            var expectedKey = configuration["InternalApiKey"] ?? "handy-internal-2024";
            if (string.IsNullOrEmpty(apiKey) || apiKey != expectedKey)
            {
                logger.LogWarning("push-notify: Invalid or missing API key");
                return Results.Unauthorized();
            }

            // Validate required fields
            if (request.TenantId <= 0)
                return Results.BadRequest(new { success = false, message = "TenantId es requerido" });
            if (string.IsNullOrWhiteSpace(request.Title))
                return Results.BadRequest(new { success = false, message = "Title es requerido" });
            if (string.IsNullOrWhiteSpace(request.Body))
                return Results.BadRequest(new { success = false, message = "Body es requerido" });

            PushResult result;

            if (request.UserIds is { Length: > 0 })
            {
                // Send to specific users
                result = await pushService.SendToUsersAsync(
                    request.UserIds.ToList(), request.TenantId,
                    request.Title, request.Body, request.Data);
            }
            else if (request.Roles is { Length: > 0 })
            {
                // Query users by role in the tenant, then send
                var userIds = await db.Usuarios
                    .IgnoreQueryFilters()
                    .Where(u => u.TenantId == request.TenantId &&
                                u.Activo &&
                                u.EliminadoEn == null &&
                                (request.Roles.Contains(u.RolExplicito!) ||
                                 (request.Roles.Contains("ADMIN") && u.EsAdmin)))
                    .Select(u => u.Id)
                    .ToListAsync();

                if (userIds.Count == 0)
                    return Results.Ok(new { success = false, deviceCount = 0, message = "No hay usuarios con esos roles en esta empresa" });

                result = await pushService.SendToUsersAsync(
                    userIds, request.TenantId,
                    request.Title, request.Body, request.Data);
            }
            else
            {
                // Send to all active devices in the tenant
                result = await pushService.SendToTenantAsync(
                    request.TenantId, request.Title, request.Body, request.Data);
            }

            logger.LogInformation(
                "Internal push-notify: tenant={TenantId}, success={Success}, devices={DeviceCount}",
                request.TenantId, result.Success, result.DeviceCount);

            return Results.Ok(new { success = result.Success, deviceCount = result.DeviceCount, message = result.Message });
        });
    }
}

public class InternalPushRequest
{
    public int TenantId { get; set; }
    public int[]? UserIds { get; set; }
    public string[]? Roles { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public Dictionary<string, string>? Data { get; set; }
}
