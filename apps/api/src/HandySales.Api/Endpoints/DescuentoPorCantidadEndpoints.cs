using FluentValidation;
using HandySales.Application.Descuentos.DTOs;
using HandySales.Application.Descuentos.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class DescuentosEndpoints
{
    public static void MapDescuentosPorCantidadEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/descuentos", async ([FromServices] DescuentoPorCantidadService servicio) =>
        {
            var descuentos = await servicio.ObtenerDescuentosAsync();
            return Results.Ok(descuentos);
        }).RequireAuthorization();

        app.MapGet("/descuentos/{id:int}", async (int id, [FromServices] DescuentoPorCantidadService servicio) =>
        {
            var dto = await servicio.ObtenerPorIdAsync(id);
            return dto is null ? Results.NotFound() : Results.Ok(dto);
        }).RequireAuthorization();

        app.MapGet("/descuentos/por-producto/{productoId:int}", async (int productoId, [FromServices] DescuentoPorCantidadService servicio) =>
        {
            var lista = await servicio.ObtenerPorProductoIdAsync(productoId);
            return Results.Ok(lista);
        }).RequireAuthorization();

        app.MapPost("/descuentos", async (DescuentoPorCantidadCreateDto dto, IValidator<DescuentoPorCantidadCreateDto> validator, [FromServices] DescuentoPorCantidadService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearDescuentoAsync(dto);
                return Results.Created($"/descuentos/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapPut("/descuentos/{id:int}", async (int id, DescuentoPorCantidadCreateDto dto, IValidator<DescuentoPorCantidadCreateDto> validator, [FromServices] DescuentoPorCantidadService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var actualizado = await servicio.ActualizarDescuentoAsync(id, dto);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapDelete("/descuentos/{id:int}", async (int id, [FromServices] DescuentoPorCantidadService servicio) =>
        {
            var eliminado = await servicio.EliminarDescuentoAsync(id);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapPatch("/descuentos/{id:int}/toggle", async (int id, [FromServices] DescuentoPorCantidadService servicio) =>
        {
            var actualizado = await servicio.ToggleActivoAsync(id);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        // Batch toggle - habilitar/deshabilitar múltiples descuentos
        app.MapPatch("/descuentos/batch-toggle", async (BatchToggleRequest request, [FromServices] DescuentoPorCantidadService servicio) =>
        {
            if (request.Ids == null || request.Ids.Count == 0)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var actualizados = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { actualizados });
        }).RequireAuthorization();
    }
}

public record BatchToggleRequest(List<int> Ids, bool Activo);
