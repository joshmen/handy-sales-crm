using FluentValidation;
using HandySales.Application.Precios.DTOs;
using HandySales.Application.Precios.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class PrecioPorProductoEndpoints
{
    public static void MapPrecioPorProductoEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/precios", async ([FromServices] PrecioPorProductoService servicio) =>
        {
            var precios = await servicio.ObtenerPreciosAsync();
            return Results.Ok(precios);
        }).RequireAuthorization();

        app.MapGet("/precios/{id:int}", async (int id, [FromServices] PrecioPorProductoService servicio) =>
        {
            var precio = await servicio.ObtenerPorIdAsync(id);
            return precio is null ? Results.NotFound() : Results.Ok(precio);
        }).RequireAuthorization();

        app.MapGet("/precios/por-lista/{listaPrecioId:int}", async (int listaPrecioId, [FromServices] PrecioPorProductoService servicio) =>
        {
            var lista = await servicio.ObtenerPorListaAsync(listaPrecioId);
            return Results.Ok(lista);
        }).RequireAuthorization();

        app.MapPost("/precios", async (PrecioPorProductoCreateDto dto, IValidator<PrecioPorProductoCreateDto> validator, [FromServices] PrecioPorProductoService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var id = await servicio.CrearPrecioAsync(dto);
            return Results.Created($"/precios/{id}", new { id });
        }).RequireAuthorization();

        app.MapPut("/precios/{id:int}", async (int id, PrecioPorProductoCreateDto dto, IValidator<PrecioPorProductoCreateDto> validator, [FromServices] PrecioPorProductoService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var actualizado = await servicio.ActualizarPrecioAsync(id, dto);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapDelete("/precios/{id:int}", async (int id, [FromServices] PrecioPorProductoService servicio) =>
        {
            var eliminado = await servicio.EliminarPrecioAsync(id);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();
    }
}
