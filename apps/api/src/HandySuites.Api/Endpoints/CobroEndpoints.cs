using FluentValidation;
using HandySuites.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Application.Cobranza.DTOs;
using HandySuites.Application.Cobranza.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

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
            IValidator<CobroCreateDto> validator,
            [FromServices] CobroService servicio,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearAsync(dto);
                var tenantId = tenantContext.TenantId ?? 0;
                if (tenantId > 0)
                    await hubContext.Clients.Group($"tenant:{tenantId}").SendAsync("DashboardUpdate", new { tipo = "cobro", id });
                return Results.Created($"/cobros/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = "Error al procesar el cobro." });
            }
        })
        .WithSummary("Registrar nuevo cobro");

        // Actualizar cobro
        group.MapPut("/{id:int}", async (
            int id,
            CobroUpdateDto dto,
            IValidator<CobroUpdateDto> validator,
            [FromServices] CobroService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

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
            [FromQuery] bool historico = false,
            [FromServices] CobroService servicio = default!) =>
        {
            var estado = await servicio.ObtenerEstadoCuentaAsync(clienteId, historico);
            return estado is null ? Results.NotFound() : Results.Ok(estado);
        })
        .WithSummary("Estado de cuenta detallado de un cliente");
    }
}
