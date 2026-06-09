using HandySuites.Application.Telemetry.DTOs;
using HandySuites.Application.Telemetry.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Mobile.Api.Endpoints;

/// <summary>
/// B.2 — Telemetría heartbeat (fix prod 2026-06-03 post-incidente Rodrigo).
/// El cliente mobile postea cada 5 min cuando hay red y la app está foreground.
/// </summary>
public static class MobileTelemetryEndpoints
{
    public static void MapMobileTelemetryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/telemetry")
            .RequireAuthorization()
            .WithTags("Telemetría");

        // POST /api/mobile/telemetry/heartbeat — el cliente reporta su estado
        // actual de sincronización. Server agrega timestamp + IP + tenant_id
        // + usuario_id del JWT.
        group.MapPost("/heartbeat", async (
            HeartbeatDto dto,
            HttpContext context,
            [FromServices] ISyncTelemetryService telemetry) =>
        {
            // Capturar IP server-side. Detrás de proxy usar X-Forwarded-For si
            // ASPNETCORE_FORWARDEDHEADERS_ENABLED está set; sino RemoteIpAddress.
            var ipAddress = context.Connection.RemoteIpAddress?.ToString();

            try
            {
                var ack = await telemetry.SaveHeartbeatAsync(dto, ipAddress);
                return Results.Ok(new { success = true, data = ack });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message });
            }
        })
        .WithSummary("Heartbeat de sincronización mobile")
        .WithDescription("Cliente mobile reporta cada 5 min su estado: pendings por tabla, last sync, app version. Server detecta backlog y alerta supervisores vía dashboard /sync-health.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);
    }
}
