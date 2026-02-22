using HandySales.Application.Cobranza.DTOs;
using HandySales.Application.Cobranza.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileCobroEndpoints
{
    public static void MapMobileCobroEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/cobros")
            .RequireAuthorization()
            .WithTags("Cobros")
            .WithOpenApi();

        // GET /api/mobile/cobros/saldos — Saldos pendientes por cliente
        group.MapGet("/saldos", async (
            [FromQuery] int? clienteId,
            [FromServices] CobroService servicio) =>
        {
            var saldos = await servicio.ObtenerSaldosAsync(clienteId);
            return Results.Ok(new { success = true, data = saldos, count = saldos.Count });
        })
        .WithSummary("Saldos pendientes por cliente")
        .WithDescription("Lista clientes con su balance pendiente de cobro. Opcionalmente filtra por clienteId.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/cobros/saldos/resumen — Resumen general de cartera
        group.MapGet("/saldos/resumen", async (
            [FromServices] CobroService servicio) =>
        {
            var resumen = await servicio.ObtenerResumenCarteraAsync();
            return Results.Ok(new { success = true, data = resumen });
        })
        .WithSummary("Resumen general de cartera")
        .WithDescription("Totales de facturación, cobranza y saldo pendiente del tenant.")
        .Produces<object>(StatusCodes.Status200OK);

        // GET /api/mobile/cobros/cliente/{clienteId}/estado-cuenta — Estado de cuenta detallado
        group.MapGet("/cliente/{clienteId:int}/estado-cuenta", async (
            int clienteId,
            [FromServices] CobroService servicio) =>
        {
            var estado = await servicio.ObtenerEstadoCuentaAsync(clienteId);
            if (estado is null)
                return Results.NotFound(new { success = false, message = "Cliente no encontrado" });

            return Results.Ok(new { success = true, data = estado });
        })
        .WithSummary("Estado de cuenta de un cliente")
        .WithDescription("Detalle de pedidos con saldos y cobros aplicados para un cliente específico.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        // POST /api/mobile/cobros — Registrar nuevo cobro
        group.MapPost("/", async (
            CobroCreateDto dto,
            [FromServices] CobroService servicio) =>
        {
            var id = await servicio.CrearAsync(dto);
            return Results.Created($"/api/mobile/cobros/{id}", new { success = true, data = new { id } });
        })
        .WithSummary("Registrar nuevo cobro")
        .WithDescription("Crea un cobro asociado a un pedido y cliente. MetodoPago: 0=Efectivo, 1=Transferencia, 2=Cheque, 3=TarjetaCredito, 4=TarjetaDebito, 5=Otro.")
        .Produces<object>(StatusCodes.Status201Created);

        // GET /api/mobile/cobros/mis-cobros — Mis cobros recientes
        group.MapGet("/mis-cobros", async (
            [FromQuery] int? clienteId,
            [FromQuery] string? desde,
            [FromQuery] string? hasta,
            [FromQuery] int pagina,
            [FromQuery] int porPagina,
            [FromServices] CobroService servicio) =>
        {
            DateTime? desdeDate = string.IsNullOrEmpty(desde) ? null : DateTime.Parse(desde);
            DateTime? hastaDate = string.IsNullOrEmpty(hasta) ? null : DateTime.Parse(hasta);

            var cobros = await servicio.ObtenerCobrosAsync(clienteId, desdeDate, hastaDate);

            var total = cobros.Count;
            if (pagina < 1) pagina = 1;
            if (porPagina < 1) porPagina = 20;

            var paginados = cobros
                .Skip((pagina - 1) * porPagina)
                .Take(porPagina)
                .ToList();

            return Results.Ok(new
            {
                success = true,
                data = paginados,
                pagination = new
                {
                    page = pagina,
                    pageSize = porPagina,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / porPagina)
                }
            });
        })
        .WithSummary("Mis cobros recientes")
        .WithDescription("Lista cobros del vendedor actual con paginación y filtros opcionales por cliente y rango de fechas.")
        .Produces<object>(StatusCodes.Status200OK);
    }
}
