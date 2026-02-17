using FluentValidation;
using HandySales.Application.UnidadesMedida.DTOs;
using HandySales.Application.UnidadesMedida.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class UnidadMedidaEndpoints
{
    public static void MapUnidadMedidaEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/unidades-medida", async ([FromServices] UnidadMedidaService servicio) =>
        {
            var unidades = await servicio.ObtenerUnidadesAsync();
            return Results.Ok(unidades);
        }).RequireAuthorization();

        app.MapGet("/unidades-medida/{id:int}", async (int id, [FromServices] UnidadMedidaService servicio) =>
        {
            var unidad = await servicio.ObtenerPorIdAsync(id);
            return unidad is null ? Results.NotFound() : Results.Ok(unidad);
        }).RequireAuthorization();

        app.MapPost("/unidades-medida", async (UnidadMedidaCreateDto dto, IValidator<UnidadMedidaCreateDto> validator, [FromServices] UnidadMedidaService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearUnidadAsync(dto);
                return Results.Created($"/unidades-medida/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapPut("/unidades-medida/{id:int}", async (int id, UnidadMedidaCreateDto dto, IValidator<UnidadMedidaCreateDto> validator, [FromServices] UnidadMedidaService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var actualizado = await servicio.ActualizarUnidadAsync(id, dto);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapDelete("/unidades-medida/{id:int}", async (int id, [FromServices] UnidadMedidaService servicio) =>
        {
            var result = await servicio.EliminarUnidadAsync(id);

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

        app.MapPatch("/unidades-medida/{id:int}/activo", async (int id, [FromBody] UnidadMedidaCambiarActivoDto dto, [FromServices] UnidadMedidaService servicio) =>
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

        app.MapPatch("/unidades-medida/batch-toggle", async (UnidadMedidaBatchToggleRequest request, [FromServices] UnidadMedidaService servicio) =>
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

public record UnidadMedidaCambiarActivoDto(bool Activo);
public record UnidadMedidaBatchToggleRequest(List<int> Ids, bool Activo);
