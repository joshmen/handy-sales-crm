using HandySales.Application.Cobranza.DTOs;
using HandySales.Application.Cobranza.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class CobroEndpoints
{
    public static void MapCobroEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/cobros")
            .RequireAuthorization()
            .WithTags("Cobros")
            .WithOpenApi();

        // Listar cobros con filtros
        group.MapGet("/", async (
            [FromQuery] int? clienteId,
            [FromQuery] string? desde,
            [FromQuery] string? hasta,
            [FromQuery] int? usuarioId,
            [FromServices] CobroService servicio) =>
        {
            DateTime? desdeDate = string.IsNullOrEmpty(desde) ? null : DateTime.Parse(desde);
            DateTime? hastaDate = string.IsNullOrEmpty(hasta) ? null : DateTime.Parse(hasta);
            var cobros = await servicio.ObtenerCobrosAsync(clienteId, desdeDate, hastaDate, usuarioId);
            return Results.Ok(cobros);
        })
        .WithSummary("Listar cobros con filtros opcionales");

        // Obtener cobro por ID
        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] CobroService servicio) =>
        {
            var cobro = await servicio.ObtenerPorIdAsync(id);
            return cobro is null ? Results.NotFound() : Results.Ok(cobro);
        })
        .WithSummary("Obtener cobro por ID");

        // Crear cobro
        group.MapPost("/", async (
            CobroCreateDto dto,
            [FromServices] CobroService servicio) =>
        {
            var id = await servicio.CrearAsync(dto);
            return Results.Created($"/cobros/{id}", new { id });
        })
        .WithSummary("Registrar nuevo cobro");

        // Actualizar cobro
        group.MapPut("/{id:int}", async (
            int id,
            CobroUpdateDto dto,
            [FromServices] CobroService servicio) =>
        {
            var ok = await servicio.ActualizarAsync(id, dto);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Actualizar cobro existente");

        // Anular cobro (soft delete)
        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] CobroService servicio) =>
        {
            var ok = await servicio.AnularAsync(id);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Anular cobro");

        // Saldos por cliente
        group.MapGet("/saldos", async (
            [FromQuery] int? clienteId,
            [FromServices] CobroService servicio) =>
        {
            var saldos = await servicio.ObtenerSaldosAsync(clienteId);
            return Results.Ok(saldos);
        })
        .WithSummary("Obtener saldos pendientes por cliente");

        // Resumen de cartera
        group.MapGet("/saldos/resumen", async (
            [FromServices] CobroService servicio) =>
        {
            var resumen = await servicio.ObtenerResumenCarteraAsync();
            return Results.Ok(resumen);
        })
        .WithSummary("Resumen general de cartera");

        // Estado de cuenta de un cliente
        group.MapGet("/cliente/{clienteId:int}/estado-cuenta", async (
            int clienteId,
            [FromServices] CobroService servicio) =>
        {
            var estado = await servicio.ObtenerEstadoCuentaAsync(clienteId);
            return estado is null ? Results.NotFound() : Results.Ok(estado);
        })
        .WithSummary("Estado de cuenta detallado de un cliente");
    }
}
