using System.Security.Claims;
using HandySales.Application.DTOs;
using HandySales.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

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
            [FromServices] IImpersonationService service) =>
        {
            var userId = GetUserId(context);
            if (userId == null)
                return Results.Unauthorized();

            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();

            try
            {
                var response = await service.StartSessionAsync(request, userId.Value, ipAddress, userAgent);
                return Results.Ok(response);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
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
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = ex.Message });
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

    private static int? GetUserId(HttpContext context)
    {
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value;

        if (int.TryParse(userIdClaim, out var userId))
            return userId;

        return null;
    }
}
