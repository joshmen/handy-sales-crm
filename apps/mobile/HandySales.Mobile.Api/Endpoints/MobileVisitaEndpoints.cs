using HandySales.Application.Visitas.DTOs;
using HandySales.Application.Visitas.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileVisitaEndpoints
{
    public static void MapMobileVisitaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/visitas")
            .RequireAuthorization()
            .WithTags("Visitas")
            .WithOpenApi();

        // === GESTIÓN DE VISITAS ===

        group.MapPost("/", async (
            ClienteVisitaCreateDto dto,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var id = await servicio.CrearAsync(dto);
            return Results.Created($"/api/mobile/visitas/{id}", new { success = true, data = new { id } });
        })
        .WithSummary("Programar visita")
        .WithDescription("Programa una nueva visita a un cliente.")
        .Produces<object>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("/hoy", async (
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visitas = await servicio.ObtenerVisitasDelDiaAsync();
            return Results.Ok(new { success = true, data = visitas, count = visitas.Count() });
        })
        .WithSummary("Visitas de hoy")
        .WithDescription("Lista las visitas programadas para hoy del vendedor.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/mis-visitas", async (
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visitas = await servicio.ObtenerMisVisitasAsync();
            return Results.Ok(new { success = true, data = visitas, count = visitas.Count() });
        })
        .WithSummary("Mis visitas")
        .WithDescription("Lista todas las visitas asignadas al vendedor.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/activa", async (
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visita = await servicio.ObtenerVisitaActivaAsync();
            if (visita is null)
                return Results.Ok(new { success = true, activa = false, data = (object?)null });

            return Results.Ok(new { success = true, activa = true, data = visita });
        })
        .WithSummary("Visita activa")
        .WithDescription("Verifica si hay una visita en curso (check-in sin check-out).")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visita = await servicio.ObtenerPorIdAsync(id);
            if (visita is null)
                return Results.NotFound(new { success = false, message = "Visita no encontrada" });

            return Results.Ok(new { success = true, data = visita });
        })
        .WithSummary("Detalle de visita")
        .WithDescription("Obtiene el detalle completo de una visita.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/cliente/{clienteId:int}", async (
            int clienteId,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visitas = await servicio.ObtenerPorClienteAsync(clienteId);
            return Results.Ok(new { success = true, data = visitas, count = visitas.Count() });
        })
        .WithSummary("Historial de visitas a cliente")
        .WithDescription("Lista el historial de visitas a un cliente específico.")
        .Produces<object>(StatusCodes.Status200OK);

        // === CHECK-IN / CHECK-OUT ===

        group.MapPost("/{id:int}/check-in", async (
            int id,
            CheckInDto dto,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resultado = await servicio.CheckInAsync(id, dto);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo registrar el check-in. Verifica que la visita exista y no tenga check-in previo." });

            return Results.Ok(new { success = true, message = "Check-in registrado exitosamente" });
        })
        .WithSummary("Registrar check-in")
        .WithDescription("Registra la llegada al cliente. Captura coordenadas GPS y hora de inicio.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/{id:int}/check-out", async (
            int id,
            CheckOutDto dto,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resultado = await servicio.CheckOutAsync(id, dto);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo registrar el check-out. Verifica que exista un check-in previo." });

            return Results.Ok(new { success = true, message = "Check-out registrado exitosamente" });
        })
        .WithSummary("Registrar check-out")
        .WithDescription("Registra la salida del cliente. Incluye resultado (venta/sin venta/no encontrado), notas y fotos.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        // === REPORTES ===

        group.MapGet("/resumen/diario", async (
            DateTime? fecha,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resumen = await servicio.ObtenerMiResumenDiarioAsync(fecha);
            return Results.Ok(new { success = true, data = resumen });
        })
        .WithSummary("Resumen diario")
        .WithDescription("Resumen del día: visitas completadas, ventas, tiempo promedio.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/resumen/semanal", async (
            DateTime? fechaInicio,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resumen = await servicio.ObtenerMiResumenSemanalAsync(fechaInicio);
            return Results.Ok(new { success = true, data = resumen, count = resumen.Count() });
        })
        .WithSummary("Resumen semanal")
        .WithDescription("Resumen de los últimos 7 días con totales y métricas de rendimiento.")
        .Produces<object>(StatusCodes.Status200OK);
    }
}
