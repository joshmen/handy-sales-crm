using FluentValidation;
using HandySuites.Application.Inventario.DTOs;
using HandySuites.Application.Inventario.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class InventarioEndpoints
{
    public static void MapInventarioEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/inventario", async ([AsParameters] InventarioFiltroDto filtro, [FromServices] InventarioService servicio) =>
        {
            var resultado = await servicio.ObtenerPorFiltroAsync(filtro);
            return Results.Ok(resultado);
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPERVISOR", "SUPER_ADMIN", "ALMACENISTA"));

        // Resumen agregado (KPIs catalog-wide) — valor, SKUs, stock bajo, agotados. 2026-06-18.
        app.MapGet("/inventario/resumen", async ([FromServices] InventarioService servicio) =>
        {
            var resumen = await servicio.ObtenerResumenAsync();
            return Results.Ok(resumen);
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPERVISOR", "SUPER_ADMIN", "ALMACENISTA"));

        app.MapGet("/inventario/{id:int}", async (int id, [FromServices] InventarioService servicio) =>
        {
            var item = await servicio.ObtenerPorIdAsync(id);
            return item is null ? Results.NotFound() : Results.Ok(item);
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPERVISOR", "SUPER_ADMIN", "ALMACENISTA"));

        app.MapGet("/inventario/por-producto/{productoId:int}", async (int productoId, [FromServices] InventarioService servicio) =>
        {
            var item = await servicio.ObtenerPorProductoIdAsync(productoId);
            return item is null ? Results.NotFound() : Results.Ok(item);
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPERVISOR", "SUPER_ADMIN", "ALMACENISTA"));

        app.MapPost("/inventario", async (InventarioCreateDto dto, IValidator<InventarioCreateDto> validator, [FromServices] InventarioService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var result = await servicio.CrearInventarioAsync(dto);
            if (!result.Success)
            {
                // Producto inexistente → 400; duplicado → 409.
                return result.ErrorKind == InventarioService.CrearInventarioErrorKind.ProductoNoExiste
                    ? Results.BadRequest(new { message = result.Error })
                    : Results.Conflict(new { message = result.Error });
            }

            return Results.Created($"/inventario/{result.Id}", new { id = result.Id });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

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
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapDelete("/inventario/{productoId:int}", async (int productoId, [FromServices] InventarioService servicio) =>
        {
            var eliminado = await servicio.EliminarInventarioAsync(productoId);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));
    }
}
