using FluentValidation;
using HandySales.Application.Promociones.DTOs;
using HandySales.Application.Promociones.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class PromocionesEndpoints
{
    public static void MapPromocionesEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/promociones", async ([FromServices] PromocionService servicio) =>
        {
            var promos = await servicio.ObtenerPromocionesAsync();
            return Results.Ok(promos);
        }).RequireAuthorization();

        app.MapGet("/promociones/{id:int}", async (int id, [FromServices] PromocionService servicio) =>
        {
            var promo = await servicio.ObtenerPorIdAsync(id);
            return promo is null ? Results.NotFound() : Results.Ok(promo);
        }).RequireAuthorization();

        app.MapPost("/promociones", async (PromocionCreateDto dto, IValidator<PromocionCreateDto> validator, [FromServices] PromocionService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearPromocionAsync(dto);
                return Results.Created($"/promociones/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapPut("/promociones/{id:int}", async (int id, PromocionCreateDto dto, IValidator<PromocionCreateDto> validator, [FromServices] PromocionService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var actualizado = await servicio.ActualizarPromocionAsync(id, dto);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapDelete("/promociones/{id:int}", async (int id, [FromServices] PromocionService servicio) =>
        {
            var eliminado = await servicio.EliminarPromocionAsync(id);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapPatch("/promociones/{id:int}/activo", async (int id, [FromBody] PromocionCambiarActivoDto dto, [FromServices] PromocionService servicio) =>
        {
            var updated = await servicio.CambiarActivoAsync(id, dto.Activo);
            return updated ? Results.Ok(new { actualizado = true }) : Results.NotFound();
        }).RequireAuthorization();

        app.MapPatch("/promociones/batch-toggle", async ([FromBody] PromocionBatchToggleRequest request, [FromServices] PromocionService servicio) =>
        {
            var count = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { actualizados = count });
        }).RequireAuthorization();
    }
}

public record PromocionCambiarActivoDto(bool Activo);
public record PromocionBatchToggleRequest(List<int> Ids, bool Activo);
