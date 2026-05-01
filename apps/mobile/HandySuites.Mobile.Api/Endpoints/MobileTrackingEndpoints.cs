using HandySuites.Application.Tracking.DTOs;
using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Application.Tracking.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileTrackingEndpoints
{
    public static void MapMobileTrackingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/tracking")
            .RequireAuthorization()
            .WithTags("Tracking")
            .WithOpenApi();

        // POST /api/mobile/tracking/batch — recibe pings GPS acumulados.
        // El mobile manda en batch (1+) cuando recupera red tras estar offline,
        // o cada vez que dispara un evento (venta/cobro/visita) + checkpoint
        // automático cada 15min. Server valida feature `tracking_vendedor`
        // del plan tenant — si no aplica, devuelve 403 con código
        // TRACKING_NOT_IN_PLAN para que mobile deshabilite el timer.
        group.MapPost("/batch", async (
            [FromBody] UbicacionBatchRequestDto request,
            [FromServices] UbicacionVendedorService service) =>
        {
            try
            {
                var result = await service.GuardarBatchAsync(request);
                return Results.Ok(new
                {
                    success = true,
                    aceptados = result.Aceptados,
                    duplicados = result.Duplicados,
                });
            }
            catch (FeatureNotInPlanException ex)
            {
                return Results.Json(new
                {
                    success = false,
                    code = "TRACKING_NOT_IN_PLAN",
                    message = ex.Message,
                }, statusCode: StatusCodes.Status403Forbidden);
            }
        })
        .WithSummary("Batch de pings GPS del vendedor")
        .WithDescription("Acepta un array de UbicacionPingDto. Persiste deduplicando por (UsuarioId, CapturadoEn). 403 si el plan no incluye tracking.");
    }
}
