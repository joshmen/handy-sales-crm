using FluentValidation;
using HandySales.Application.Clientes.DTOs;
using HandySales.Application.Clientes.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class ClienteEndpoints
{
    public static void MapClienteEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/clientes", async (
            ClienteCreateDto dto,
            IValidator<ClienteCreateDto> validator,
            [FromServices] ClienteService servicio) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var result = await servicio.CrearClienteAsync(dto);
            if (!result.Success)
                return Results.Conflict(new { message = result.Error });

            return Results.Created($"/clientes/{result.Id}", new { id = result.Id });
        }).RequireAuthorization();

        app.MapGet("/clientes", async (
            [AsParameters] ClienteFiltroDto filtro,
            [FromServices] ClienteService servicio) =>
        {
            var resultado = await servicio.ObtenerPorFiltroAsync(filtro);
            return Results.Ok(resultado);
        }).RequireAuthorization();

        app.MapGet("/clientes/{id:int}", async (int id, [FromServices] ClienteService servicio) =>
        {
            var cliente = await servicio.ObtenerPorIdAsync(id);
            return cliente is null ? Results.NotFound() : Results.Ok(cliente);
        }).RequireAuthorization();

        app.MapPut("/clientes/{id:int}", async (
            int id,
            ClienteCreateDto dto,
            IValidator<ClienteCreateDto> validator,
            [FromServices] ClienteService servicio) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var result = await servicio.ActualizarClienteAsync(id, dto);
            if (!result.Success)
            {
                if (result.Error?.Contains("Ya existe") == true)
                    return Results.Conflict(new { message = result.Error });
                return Results.NotFound(new { message = result.Error });
            }
            return Results.NoContent();
        }).RequireAuthorization();


        app.MapDelete("/clientes/{id:int}", async (int id, [FromServices] ClienteService servicio) =>
        {
            var deleted = await servicio.EliminarClienteAsync(id);
            return deleted ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapPatch("/clientes/{id:int}/activo", async (int id, [FromBody] ClienteCambiarActivoDto dto, [FromServices] ClienteService servicio) =>
        {
            var actualizado = await servicio.CambiarActivoAsync(id, dto.Activo);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        app.MapPatch("/clientes/batch-toggle", async (ClienteBatchToggleRequest request, [FromServices] ClienteService servicio) =>
        {
            if (request.Ids == null || request.Ids.Count == 0)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var actualizados = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            return Results.Ok(new { actualizados });
        }).RequireAuthorization();
    }
}

public record ClienteCambiarActivoDto(bool Activo);
public record ClienteBatchToggleRequest(List<int> Ids, bool Activo);
