using FluentValidation;
using HandySuites.Application.ListasPrecios.DTOs;
using HandySuites.Application.ListasPrecios.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class ListaPrecioEndpoints
{
    public static void MapListaPrecioEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/listas-precios", async ([FromServices] ListaPrecioService servicio) =>
        {
            var listas = await servicio.ObtenerListasAsync();
            return Results.Ok(listas);
        }).RequireAuthorization();

        app.MapGet("/listas-precios/{id:int}", async (int id, [FromServices] ListaPrecioService servicio) =>
        {
            var lista = await servicio.ObtenerPorIdAsync(id);
            return lista is null ? Results.NotFound() : Results.Ok(lista);
        }).RequireAuthorization();

        app.MapPost("/listas-precios", async (ListaPrecioCreateDto dto, IValidator<ListaPrecioCreateDto> validator, [FromServices] ListaPrecioService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearListaPrecioAsync(dto);
                return Results.Created($"/listas-precios/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPut("/listas-precios/{id:int}", async (int id, ListaPrecioCreateDto dto, IValidator<ListaPrecioCreateDto> validator, [FromServices] ListaPrecioService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var actualizado = await servicio.ActualizarListaPrecioAsync(id, dto);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapDelete("/listas-precios/{id:int}", async (int id, bool? forzar, [FromServices] ListaPrecioService servicio) =>
        {
            var result = await servicio.EliminarListaPrecioAsync(id, forzar ?? false);
            if (result.Success) return Results.NoContent();
            if (result.PreciosActivos > 0)
                return Results.Conflict(new { error = result.Error, preciosActivos = result.PreciosActivos });
            return Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/listas-precios/{id:int}/activo", async (int id, [FromBody] ListaPrecioCambiarActivoDto dto, [FromServices] ListaPrecioService servicio) =>
        {
            var updated = await servicio.CambiarActivoAsync(id, dto.Activo);
            return updated ? Results.Ok(new { actualizado = true }) : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/listas-precios/batch-toggle", async (ListaPrecioBatchToggleRequest request, [FromServices] ListaPrecioService servicio) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var count = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { actualizados = count });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));
    }
}
