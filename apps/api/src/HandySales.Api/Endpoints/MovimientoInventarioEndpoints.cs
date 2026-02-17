using FluentValidation;
using HandySales.Application.MovimientosInventario.DTOs;
using HandySales.Application.MovimientosInventario.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class MovimientoInventarioEndpoints
{
    public static void MapMovimientoInventarioEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/movimientos-inventario")
            .WithTags("Movimientos de Inventario")
            .RequireAuthorization();

        // Obtener movimientos con paginación y filtros
        group.MapGet("", async ([AsParameters] MovimientoInventarioFiltroDto filtro, [FromServices] MovimientoInventarioService servicio) =>
        {
            var resultado = await servicio.ObtenerPorFiltroAsync(filtro);
            return Results.Ok(resultado);
        });

        // Obtener un movimiento por ID
        group.MapGet("{id:int}", async (int id, [FromServices] MovimientoInventarioService servicio) =>
        {
            var item = await servicio.ObtenerPorIdAsync(id);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        // Obtener movimientos por producto
        group.MapGet("por-producto/{productoId:int}", async (int productoId, int? limite, [FromServices] MovimientoInventarioService servicio) =>
        {
            var items = await servicio.ObtenerPorProductoAsync(productoId, limite ?? 10);
            return Results.Ok(items);
        });

        // Crear un nuevo movimiento de inventario
        group.MapPost("", async (
            MovimientoInventarioCreateDto dto,
            IValidator<MovimientoInventarioCreateDto> validator,
            [FromServices] MovimientoInventarioService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var (movimientoId, success, error) = await servicio.CrearMovimientoAsync(dto);

            if (!success)
            {
                return Results.BadRequest(new { message = error });
            }

            return Results.Created($"/movimientos-inventario/{movimientoId}", new { id = movimientoId });
        });
    }
}
