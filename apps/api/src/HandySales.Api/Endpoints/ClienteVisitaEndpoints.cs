using HandySales.Application.Visitas.DTOs;
using HandySales.Application.Visitas.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class ClienteVisitaEndpoints
{
    public static void MapClienteVisitaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/visitas")
            .RequireAuthorization()
            .WithTags("Visitas")
            .WithOpenApi();

        // CRUD
        group.MapPost("/", async (
            ClienteVisitaCreateDto dto,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var id = await servicio.CrearAsync(dto);
            return Results.Created($"/visitas/{id}", new { id });
        })
        .WithSummary("Programar nueva visita")
        .WithDescription("Programa una nueva visita a un cliente. Puede especificar fecha programada, notas y ubicación.")
        .Produces<object>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/", async (
            [AsParameters] ClienteVisitaFiltroDto filtro,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resultado = await servicio.ObtenerPorFiltroAsync(filtro);
            return Results.Ok(resultado);
        })
        .WithSummary("Listar visitas con filtros")
        .WithDescription("Obtiene lista paginada de visitas. Filtros: cliente, usuario, fecha, resultado.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visita = await servicio.ObtenerPorIdAsync(id);
            return visita is null ? Results.NotFound() : Results.Ok(visita);
        })
        .WithSummary("Obtener visita por ID")
        .WithDescription("Retorna el detalle completo de una visita incluyendo coordenadas y fotos.")
        .Produces<ClienteVisitaDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var eliminado = await servicio.EliminarAsync(id);
            return eliminado ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Eliminar visita")
        .WithDescription("Elimina una visita programada. No se pueden eliminar visitas ya completadas.")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status401Unauthorized);

        // Check-in / Check-out
        group.MapPost("/{id:int}/check-in", async (
            int id,
            CheckInDto dto,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resultado = await servicio.CheckInAsync(id, dto);
            return resultado
                ? Results.Ok(new { mensaje = "Check-in registrado exitosamente" })
                : Results.BadRequest(new { error = "No se pudo registrar el check-in. Verifique que la visita exista y no tenga ya un check-in." });
        })
        .WithSummary("Registrar check-in")
        .WithDescription("Registra la llegada del vendedor al cliente. Captura coordenadas GPS y hora de inicio.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{id:int}/check-out", async (
            int id,
            CheckOutDto dto,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resultado = await servicio.CheckOutAsync(id, dto);
            return resultado
                ? Results.Ok(new { mensaje = "Check-out registrado exitosamente" })
                : Results.BadRequest(new { error = "No se pudo registrar el check-out. Verifique que exista un check-in previo." });
        })
        .WithSummary("Registrar check-out")
        .WithDescription("Registra la salida del vendedor. Incluye resultado (venta, sin venta, no encontrado), notas y fotos.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        // Consultas del vendedor actual
        group.MapGet("/mis-visitas", async (
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visitas = await servicio.ObtenerMisVisitasAsync();
            return Results.Ok(visitas);
        })
        .WithSummary("Mis visitas")
        .WithDescription("Obtiene todas las visitas asignadas al vendedor autenticado.")
        .Produces<List<ClienteVisitaListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/hoy", async (
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visitas = await servicio.ObtenerVisitasDelDiaAsync();
            return Results.Ok(visitas);
        })
        .WithSummary("Visitas de hoy")
        .WithDescription("Obtiene las visitas programadas para hoy del vendedor autenticado.")
        .Produces<List<ClienteVisitaListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/activa", async (
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visita = await servicio.ObtenerVisitaActivaAsync();
            return visita is null
                ? Results.Ok(new { activa = false })
                : Results.Ok(new { activa = true, visita });
        })
        .WithSummary("Visita activa")
        .WithDescription("Verifica si el vendedor tiene una visita en curso (check-in sin check-out).")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Consultas por cliente
        group.MapGet("/cliente/{clienteId:int}", async (
            int clienteId,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visitas = await servicio.ObtenerPorClienteAsync(clienteId);
            return Results.Ok(visitas);
        })
        .WithSummary("Visitas por cliente")
        .WithDescription("Obtiene el historial de visitas a un cliente específico.")
        .Produces<List<ClienteVisitaListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Consultas por usuario (para admins)
        group.MapGet("/usuario/{usuarioId:int}", async (
            int usuarioId,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visitas = await servicio.ObtenerPorUsuarioAsync(usuarioId);
            return Results.Ok(visitas);
        })
        .WithSummary("Visitas por vendedor")
        .WithDescription("Obtiene todas las visitas de un vendedor específico (solo admin).")
        .Produces<List<ClienteVisitaListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/usuario/{usuarioId:int}/dia", async (
            int usuarioId,
            DateTime? fecha,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var visitas = await servicio.ObtenerVisitasDelDiaPorUsuarioAsync(usuarioId, fecha);
            return Results.Ok(visitas);
        })
        .WithSummary("Visitas del día por vendedor")
        .WithDescription("Obtiene las visitas de un vendedor en una fecha específica (solo admin).")
        .Produces<List<ClienteVisitaListaDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Reportes
        group.MapGet("/mi-resumen/diario", async (
            DateTime? fecha,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resumen = await servicio.ObtenerMiResumenDiarioAsync(fecha);
            return Results.Ok(resumen);
        })
        .WithSummary("Mi resumen diario")
        .WithDescription("Resumen del día del vendedor: visitas completadas, ventas, tiempo promedio.")
        .Produces<VisitaResumenDiarioDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/mi-resumen/semanal", async (
            DateTime? fechaInicio,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resumen = await servicio.ObtenerMiResumenSemanalAsync(fechaInicio);
            return Results.Ok(resumen);
        })
        .WithSummary("Mi resumen semanal")
        .WithDescription("Resumen de la semana del vendedor: lista de 7 días con totales y métricas de rendimiento.")
        .Produces<IEnumerable<VisitaResumenDiarioDto>>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/resumen/{usuarioId:int}/diario", async (
            int usuarioId,
            DateTime? fecha,
            [FromServices] ClienteVisitaService servicio) =>
        {
            var resumen = await servicio.ObtenerResumenDiarioPorUsuarioAsync(usuarioId, fecha);
            return Results.Ok(resumen);
        })
        .WithSummary("Resumen diario por vendedor")
        .WithDescription("Resumen del día de un vendedor específico (solo admin).")
        .Produces<VisitaResumenDiarioDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);
    }
}
