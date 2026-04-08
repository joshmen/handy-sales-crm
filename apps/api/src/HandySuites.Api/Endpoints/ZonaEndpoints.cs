using FluentValidation;
using HandySuites.Application.Zonas.DTOs;
using HandySuites.Application.Zonas.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class ZonasEndpoints
{
    public static void MapZonaEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/zonas", async (CreateZonaDto dto, IValidator<CreateZonaDto> validator, [FromServices] ZonaService servicio, HttpContext context) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var usuario = context.User.Identity?.Name ?? "sistema";
            var result = await servicio.CrearZonaAsync(dto, usuario);
            if (!result.Success)
                return Results.BadRequest(new { error = result.Error });
            return Results.Created($"/zonas/{result.Id}", new { id = result.Id });
        }).RequireAuthorization();

        app.MapGet("/zonas", async ([FromServices] ZonaService servicio) =>
        {
            var zonas = await servicio.ObtenerZonasAsync();
            return Results.Ok(zonas);
        }).RequireAuthorization();

        app.MapGet("/zonas/{id:int}", async (int id, [FromServices] ZonaService servicio) =>
        {
            var zona = await servicio.ObtenerPorIdAsync(id);
            return zona is null ? Results.NotFound() : Results.Ok(zona);
        }).RequireAuthorization();

        app.MapPut("/zonas/{id:int}", async (int id, UpdateZonaDto dto, IValidator<UpdateZonaDto> validator, [FromServices] ZonaService servicio, HttpContext context) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var usuario = context.User.Identity?.Name ?? "sistema";
            var result = await servicio.ActualizarZonaAsync(id, dto, usuario);
            if (!result.Success)
                return Results.BadRequest(new { error = result.Error });
            return Results.NoContent();
        }).RequireAuthorization();

        app.MapDelete("/zonas/{id:int}", async (int id, [FromServices] ZonaService servicio) =>
        {
            var result = await servicio.EliminarZonaAsync(id);

            if (!result.Success)
            {
                // Si hay clientes asociados, retornar 409 Conflict
                if (result.ClientesCount > 0)
                {
                    return Results.Conflict(new
                    {
                        message = result.Error,
                        clientesCount = result.ClientesCount
                    });
                }

                // Si no existe, retornar 404
                return Results.NotFound(new { message = result.Error });
            }

            return Results.NoContent();
        }).RequireAuthorization();

        app.MapPatch("/zonas/{id:int}/activo", async (int id, [FromBody] ZonaCambiarActivoDto dto, [FromServices] ZonaService servicio) =>
        {
            var result = await servicio.CambiarActivoAsync(id, dto.Activo);

            if (!result.Success)
            {
                if (result.ClientesCount > 0)
                    return Results.Conflict(new { message = result.Error, clientesCount = result.ClientesCount });
                return Results.NotFound(new { message = result.Error });
            }

            return Results.Ok(new { actualizado = true });
        }).RequireAuthorization();

        app.MapPatch("/zonas/batch-toggle", async (ZonaBatchToggleRequest request, [FromServices] ZonaService servicio) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var result = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);

            if (!result.Success)
                return Results.Conflict(new { message = result.Error, clientesCount = result.ClientesCount });

            return Results.Ok(new { actualizados = request.Ids.Count });
        }).RequireAuthorization();
    }
}

public record ZonaCambiarActivoDto(bool Activo);
public record ZonaBatchToggleRequest(List<int> Ids, bool Activo);
