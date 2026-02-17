using FluentValidation;
using HandySales.Application.Inventario.DTOs;
using HandySales.Application.Inventario.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class InventarioEndpoints
{
    public static void MapInventarioEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/inventario", async ([AsParameters] InventarioFiltroDto filtro, [FromServices] InventarioService servicio) =>
        {
            var resultado = await servicio.ObtenerPorFiltroAsync(filtro);
            return Results.Ok(resultado);
        }).RequireAuthorization();

        app.MapGet("/inventario/{id:int}", async (int id, [FromServices] InventarioService servicio) =>
        {
            var item = await servicio.ObtenerPorIdAsync(id);
            return item is null ? Results.NotFound() : Results.Ok(item);
        }).RequireAuthorization();

        app.MapGet("/inventario/por-producto/{productoId:int}", async (int productoId, [FromServices] InventarioService servicio) =>
        {
            var item = await servicio.ObtenerPorProductoIdAsync(productoId);
            return item is null ? Results.NotFound() : Results.Ok(item);
        }).RequireAuthorization();

        app.MapPost("/inventario", async (InventarioCreateDto dto, IValidator<InventarioCreateDto> validator, [FromServices] InventarioService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var result = await servicio.CrearInventarioAsync(dto);
            if (!result.Success)
                return Results.Conflict(new { message = result.Error });

            return Results.Created($"/inventario/{result.Id}", new { id = result.Id });
        }).RequireAuthorization();

        app.MapPut("/inventario/{id:int}", async (int id, InventarioUpdateDto dto, IValidator<InventarioUpdateDto> validator, [FromServices] InventarioService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var actualizado = await servicio.ActualizarInventarioAsync(id, dto);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapDelete("/inventario/{productoId:int}", async (int productoId, [FromServices] InventarioService servicio) =>
        {
            var eliminado = await servicio.EliminarInventarioAsync(productoId);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();
    }
}
