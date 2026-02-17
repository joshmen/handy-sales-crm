using HandySales.Application.NotificationPreferences.DTOs;
using HandySales.Application.NotificationPreferences.Interfaces;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HandySales.Api.Endpoints
{
    public static class NotificationPreferencesEndpoints
    {
        public static void MapNotificationPreferencesEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/notification-preferences")
                .RequireAuthorization()
                .WithTags("Notification Preferences");

            // GET /api/notification-preferences
            group.MapGet("/", async (
                HttpContext context,
                [FromServices] INotificationPreferenceService notificationService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var userId = GetCurrentUserId(context);
                    var tenantId = currentTenant.TenantId;

                    var preferences = await notificationService.GetByUserIdAsync(tenantId, userId);
                    
                    if (preferences == null)
                    {
                        // Si no tiene preferencias, crear unas por defecto
                        var defaultRequest = new CreateNotificationPreferenceRequest();
                        preferences = await notificationService.CreateAsync(tenantId, userId, defaultRequest);
                    }

                    return Results.Ok(preferences);
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("GetMyNotificationPreferences")
            .WithSummary("Obtener preferencias de notificación del usuario actual")
            .Produces<NotificationPreferenceDto>();

            // POST /api/notification-preferences
            group.MapPost("/", async (
                CreateNotificationPreferenceRequest request,
                HttpContext context,
                [FromServices] INotificationPreferenceService notificationService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var userId = GetCurrentUserId(context);
                    var tenantId = currentTenant.TenantId;

                    // Verificar si ya existe
                    var existingPreferences = await notificationService.GetByUserIdAsync(tenantId, userId);

                    NotificationPreferenceDto? result;

                    if (existingPreferences == null)
                    {
                        // Crear nuevas preferencias
                        result = await notificationService.CreateAsync(tenantId, userId, request);
                    }
                    else
                    {
                        // Actualizar preferencias existentes
                        var updateRequest = new UpdateNotificationPreferenceRequest
                        {
                            Id = existingPreferences.Id,
                            EmailNotifications = request.EmailNotifications,
                            PushNotifications = request.PushNotifications,
                            SmsNotifications = request.SmsNotifications,
                            DesktopNotifications = request.DesktopNotifications,
                            EmailOrderUpdates = request.EmailOrderUpdates,
                            EmailInventoryAlerts = request.EmailInventoryAlerts,
                            EmailWeeklyReports = request.EmailWeeklyReports,
                            PushOrderUpdates = request.PushOrderUpdates,
                            PushInventoryAlerts = request.PushInventoryAlerts,
                            PushRouteReminders = request.PushRouteReminders,
                            QuietHoursStart = request.QuietHoursStart,
                            QuietHoursEnd = request.QuietHoursEnd
                        };

                        result = await notificationService.UpdateAsync(tenantId, userId, updateRequest);
                    }

                    if (result == null)
                    {
                        return Results.BadRequest("No se pudieron guardar las preferencias");
                    }

                    return Results.Ok(result);
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("SaveNotificationPreferences")
            .WithSummary("Crear o actualizar preferencias de notificación")
            .Produces<NotificationPreferenceDto>();

            // GET /api/notification-preferences/{userId} - Para administradores
            group.MapGet("/{userId:int}", async (
                int userId,
                HttpContext context,
                [FromServices] INotificationPreferenceService notificationService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var tenantId = currentTenant.TenantId;
                    var preferences = await notificationService.GetByUserIdAsync(tenantId, userId);

                    return preferences != null 
                        ? Results.Ok(preferences)
                        : Results.NotFound($"No se encontraron preferencias para el usuario {userId}");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .RequireAuthorization(policy => policy.RequireRole("ADMIN", "SUPER_ADMIN"))
            .WithName("GetUserNotificationPreferences")
            .WithSummary("Obtener preferencias de notificación de un usuario específico")
            .Produces<NotificationPreferenceDto>();
        }

        private static int GetCurrentUserId(HttpContext context)
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : throw new UnauthorizedAccessException();
        }
    }
}