using System.Security.Claims;
using HandySuites.Api.Hubs;
using HandySuites.Application.DTOs;
using HandySuites.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// Endpoints de impersonación para SUPER_ADMIN.
/// Todos los endpoints requieren rol SUPER_ADMIN.
/// </summary>
public static class ImpersonationEndpoints
{
    public static void MapImpersonationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/impersonation")
            .WithTags("Impersonation")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"));

        // Iniciar sesión de impersonación
        group.MapPost("/start", async (
            StartImpersonationRequest request,
            HttpContext context,
            [FromServices] IImpersonationService service,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var userId = GetUserId(context);
            if (userId == null)
                return Results.Unauthorized();

            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();

            try
            {
                var response = await service.StartSessionAsync(request, userId.Value, ipAddress, userAgent);

                // Push real-time notification to all users in the target tenant
                await hubContext.Clients.Group($"tenant:{request.TargetTenantId}")
                    .SendAsync("ReceiveNotification", new
                    {
                        id = 0,
                        titulo = "Acceso de Soporte",
                        mensaje = $"Un administrador del sistema ha accedido a su cuenta en modo soporte.",
                        tipo = 5, // System
                        timestamp = DateTime.UtcNow
                    });

                return Results.Ok(response);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { message = "No se pudo completar la acción de impersonación." });
            }
            catch (ArgumentException)
            {
                return Results.BadRequest(new { message = "No se pudo completar la acción de impersonación." });
            }
        });

        // Finalizar sesión de impersonación
        group.MapPost("/end", async (
            EndImpersonationRequest request,
            HttpContext context,
            [FromServices] IImpersonationService service) =>
        {
            var userId = GetUserId(context);
            if (userId == null)
                return Results.Unauthorized();

            try
            {
                await service.EndSessionAsync(request.SessionId, userId.Value);
                return Results.Ok(new { message = "Sesión finalizada correctamente" });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (Exception)
            {
                return Results.BadRequest(new { message = "No se pudo completar la acción de impersonación." });
            }
        });

        // Obtener estado actual de impersonación
        group.MapGet("/current", async (
            HttpContext context,
            [FromServices] IImpersonationService service) =>
        {
            var userId = GetUserId(context);
            if (userId == null)
                return Results.Unauthorized();

            var state = await service.GetCurrentStateAsync(userId.Value);
            return Results.Ok(state);
        });

        // Registrar acción durante impersonación (para auditoría)
        group.MapPost("/log-action", async (
            LogImpersonationActionRequest request,
            [FromServices] IImpersonationService service) =>
        {
            await service.LogActionAsync(request);
            return Results.Ok();
        });

        // Obtener historial de sesiones
        group.MapGet("/history", async (
            [FromQuery] int? superAdminId,
            [FromQuery] int? targetTenantId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? status,
            [FromQuery] int page,
            [FromQuery] int pageSize,
            [FromServices] IImpersonationService service) =>
        {
            var filter = new ImpersonationHistoryFilter
            {
                SuperAdminId = superAdminId,
                TargetTenantId = targetTenantId,
                FromDate = fromDate,
                ToDate = toDate,
                Status = status,
                Page = page > 0 ? page : 1,
                PageSize = pageSize > 0 ? Math.Min(pageSize, 100) : 20
            };

            var history = await service.GetHistoryAsync(filter);
            return Results.Ok(history);
        });

        // Obtener detalles de una sesión específica
        group.MapGet("/sessions/{sessionId:guid}", async (
            Guid sessionId,
            [FromServices] IImpersonationService service) =>
        {
            var session = await service.GetSessionDetailsAsync(sessionId);
            return session == null ? Results.NotFound() : Results.Ok(session);
        });

        // Validar sesión activa (usado internamente)
        group.MapGet("/validate/{sessionId:guid}", async (
            Guid sessionId,
            HttpContext context,
            [FromServices] IImpersonationService service) =>
        {
            var userId = GetUserId(context);
            if (userId == null)
                return Results.Unauthorized();

            var isValid = await service.ValidateSessionAsync(sessionId, userId.Value);
            return Results.Ok(new { isValid });
        });
    }

    /// <summary>
    /// Endpoints de historial de impersonación accesibles para ADMIN del tenant.
    /// Auto-filtra por tenant actual — nunca expone datos cross-tenant.
    /// </summary>
    public static void MapTenantImpersonationHistoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/impersonation-history")
            .WithTags("Impersonation History")
            .RequireAuthorization();

        group.MapGet("/", async (
            HttpContext context,
            [FromServices] IImpersonationService service,
            [FromServices] HandySuites.Shared.Multitenancy.ICurrentTenant currentTenant,
            [FromQuery] string? status,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10) =>
        {
            if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                return Results.Forbid();

            var filter = new ImpersonationHistoryFilter
            {
                TargetTenantId = currentTenant.TenantId,
                FromDate = fromDate,
                ToDate = toDate?.Date.AddDays(1).AddTicks(-1),
                Status = status,
                Page = page > 0 ? page : 1,
                PageSize = pageSize > 0 ? Math.Min(pageSize, 50) : 10
            };

            var history = await service.GetHistoryAsync(filter);
            return Results.Ok(history);
        });
    }

    private static int? GetUserId(HttpContext context)
    {
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value;

        if (int.TryParse(userIdClaim, out var userId))
            return userId;

        return null;
    }
}
