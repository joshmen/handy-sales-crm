using FluentValidation;
using HandySales.Application.FamiliasProductos.DTOs;
using HandySales.Application.FamiliasProductos.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class FamiliasProductosEndpoints
{
    public static void MapFamiliasProductosEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/familias-productos", async (
            FamiliaProductoCreateDto dto,
            IValidator<FamiliaProductoCreateDto> validator,
            [FromServices] FamiliaProductoService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearFamiliaAsync(dto);
                return Results.Created($"/familias-productos/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapGet("/familias-productos", async ([FromServices] FamiliaProductoService servicio) =>
        {
            var familias = await servicio.ObtenerFamiliasAsync();
            return Results.Ok(familias);
        }).RequireAuthorization();

        app.MapGet("/familias-productos/{id:int}", async (int id, [FromServices] FamiliaProductoService servicio) =>
        {
            var familia = await servicio.ObtenerPorIdAsync(id);
            return familia is null ? Results.NotFound() : Results.Ok(familia);
        }).RequireAuthorization();

        app.MapPut("/familias-productos/{id:int}", async (
            int id,
            FamiliaProductoCreateDto dto,
            IValidator<FamiliaProductoCreateDto> validator,
            [FromServices] FamiliaProductoService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());


            try
            {
                var actualizado = await servicio.ActualizarFamiliaAsync(id, dto);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapDelete("/familias-productos/{id:int}", async (
            int id,
            [FromServices] FamiliaProductoService servicio) =>
        {
            var result = await servicio.EliminarFamiliaAsync(id);

            if (!result.Success)
            {
                // Si hay productos asociados, retornar 409 Conflict
                if (result.ProductosCount > 0)
                {
                    return Results.Conflict(new
                    {
                        message = result.Error,
                        productosCount = result.ProductosCount
                    });
                }

                // Si no existe, retornar 404
                return Results.NotFound(new { message = result.Error });
            }

            return Results.NoContent();
        }).RequireAuthorization();

        app.MapPatch("/familias-productos/{id:int}/activo", async (int id, [FromBody] FamiliaCambiarActivoDto dto, [FromServices] FamiliaProductoService servicio) =>
        {
            var result = await servicio.CambiarActivoAsync(id, dto.Activo);

            if (!result.Success)
            {
                if (result.ProductosCount > 0)
                    return Results.Conflict(new { message = result.Error, productosCount = result.ProductosCount });
                return Results.NotFound(new { message = result.Error });
            }

            return Results.Ok(new { actualizado = true });
        }).RequireAuthorization();

        app.MapPatch("/familias-productos/batch-toggle", async (FamiliaBatchToggleRequest request, [FromServices] FamiliaProductoService servicio) =>
        {
            if (request.Ids == null || request.Ids.Count == 0)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var result = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);

            if (!result.Success)
                return Results.Conflict(new { message = result.Error, productosCount = result.ProductosCount });

            return Results.Ok(new { actualizados = request.Ids.Count });
        }).RequireAuthorization();
    }
}

public record FamiliaCambiarActivoDto(bool Activo);
public record FamiliaBatchToggleRequest(List<int> Ids, bool Activo);
