using HandySales.Application.Rutas.Services;
using HandySales.Application.Rutas.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileRutaEndpoints
{
    public static void MapMobileRutaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/rutas")
            .RequireAuthorization()
            .WithTags("Rutas")
            .WithOpenApi();

        group.MapGet("/hoy", async (
            [FromServices] RutaVendedorService servicio) =>
        {
            var ruta = await servicio.ObtenerMiRutaDelDiaAsync();
            if (ruta is null)
                return Results.Ok(new { success = true, tieneRuta = false, data = (object?)null });

            return Results.Ok(new { success = true, tieneRuta = true, data = ruta });
        })
        .WithSummary("Ruta de hoy")
        .WithDescription("Obtiene la ruta asignada para el día actual.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/pendientes", async (
            [FromServices] RutaVendedorService servicio) =>
        {
            var rutas = await servicio.ObtenerMisRutasPendientesAsync();
            return Results.Ok(new { success = true, data = rutas, count = rutas.Count });
        })
        .WithSummary("Mis rutas pendientes")
        .WithDescription("Lista todas las rutas pendientes asignadas al vendedor.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            var ruta = await servicio.ObtenerPorIdAsync(id);
            if (ruta is null)
                return Results.NotFound(new { success = false, message = "Ruta no encontrada" });

            return Results.Ok(new { success = true, data = ruta });
        })
        .WithSummary("Detalle de ruta")
        .WithDescription("Obtiene el detalle completo de una ruta con sus clientes.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/{id:int}/iniciar", async (
            int id,
            [FromServices] RutaVendedorService servicio) =>
        {
            try
            {
                var resultado = await servicio.IniciarRutaAsync(id);
                if (!resultado)
                    return Results.BadRequest(new { success = false, message = "No se pudo iniciar la ruta" });

                return Results.Ok(new { success = true, message = "Ruta iniciada" });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message });
            }
        })
        .WithSummary("Iniciar ruta")
        .WithDescription("Marca el inicio de la ruta del día.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/{id:int}/completar", async (
            int id,
            [FromBody] CompletarRutaRequest? request,
            [FromServices] RutaVendedorService servicio) =>
        {
            try
            {
                var resultado = await servicio.CompletarRutaAsync(id, request?.KilometrosReales);
                if (!resultado)
                    return Results.BadRequest(new { success = false, message = "No se pudo completar la ruta" });

                return Results.Ok(new { success = true, message = "Ruta completada" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message });
            }
        })
        .WithSummary("Completar ruta")
        .WithDescription("Marca el fin de la ruta del día.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/{id:int}/cancelar", async (
            int id,
            [FromBody] CancelarRutaRequest? request,
            [FromServices] RutaVendedorService servicio) =>
        {
            try
            {
                var resultado = await servicio.CancelarRutaAsync(id, request?.Motivo);
                if (!resultado)
                    return Results.BadRequest(new { success = false, message = "No se pudo cancelar la ruta" });

                return Results.Ok(new { success = true, message = "Ruta cancelada" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message });
            }
        })
        .WithSummary("Cancelar ruta")
        .WithDescription("Cancela una ruta planificada.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        // Gestión de paradas
        group.MapGet("/{rutaId:int}/parada-actual", async (
            int rutaId,
            [FromServices] RutaVendedorService servicio) =>
        {
            var parada = await servicio.ObtenerParadaActualAsync(rutaId);
            if (parada is null)
                return Results.Ok(new { success = true, tieneParadaActual = false, data = (object?)null });

            return Results.Ok(new { success = true, tieneParadaActual = true, data = parada });
        })
        .WithSummary("Parada actual")
        .WithDescription("Obtiene la parada donde el vendedor se encuentra actualmente.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/{rutaId:int}/siguiente-parada", async (
            int rutaId,
            [FromServices] RutaVendedorService servicio) =>
        {
            var parada = await servicio.ObtenerSiguienteParadaAsync(rutaId);
            if (parada is null)
                return Results.Ok(new { success = true, tieneSiguienteParada = false, data = (object?)null });

            return Results.Ok(new { success = true, tieneSiguienteParada = true, data = parada });
        })
        .WithSummary("Siguiente parada")
        .WithDescription("Obtiene la siguiente parada en la ruta.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapPost("/paradas/{detalleId:int}/llegar", async (
            int detalleId,
            [FromBody] LlegarParadaDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            try
            {
                var resultado = await servicio.LlegarAParadaAsync(detalleId, dto);
                if (!resultado)
                    return Results.BadRequest(new { success = false, message = "No se pudo registrar la llegada" });

                return Results.Ok(new { success = true, message = "Llegada registrada" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message });
            }
        })
        .WithSummary("Registrar llegada a parada")
        .WithDescription("Registra la llegada del vendedor a una parada de la ruta.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/paradas/{detalleId:int}/salir", async (
            int detalleId,
            [FromBody] SalirParadaDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            try
            {
                var resultado = await servicio.SalirDeParadaAsync(detalleId, dto);
                if (!resultado)
                    return Results.BadRequest(new { success = false, message = "No se pudo registrar la salida" });

                return Results.Ok(new { success = true, message = "Salida registrada" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message });
            }
        })
        .WithSummary("Registrar salida de parada")
        .WithDescription("Registra la salida del vendedor de una parada, opcionalmente con visita/pedido asociado.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/paradas/{detalleId:int}/omitir", async (
            int detalleId,
            [FromBody] OmitirParadaDto dto,
            [FromServices] RutaVendedorService servicio) =>
        {
            try
            {
                var resultado = await servicio.OmitirParadaAsync(detalleId, dto);
                if (!resultado)
                    return Results.BadRequest(new { success = false, message = "No se pudo omitir la parada" });

                return Results.Ok(new { success = true, message = "Parada omitida" });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message });
            }
        })
        .WithSummary("Omitir parada")
        .WithDescription("Marca una parada como omitida con el motivo correspondiente.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);
    }
}

public class CompletarRutaRequest
{
    public double? KilometrosReales { get; set; }
}

public class CancelarRutaRequest
{
    public string? Motivo { get; set; }
}
