using HandySuites.Application.Impuestos.DTOs;
using HandySuites.Application.Impuestos.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class TasaImpuestoEndpoints
{
    public static void MapTasaImpuestoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/impuestos")
            .WithTags("Impuestos")
            .RequireAuthorization();

        group.MapGet("/", async ([FromQuery] bool? incluirInactivas, [FromServices] TasaImpuestoService service) =>
        {
            var tasas = await service.ObtenerTodasAsync(incluirInactivas ?? false);
            return Results.Ok(tasas);
        });

        group.MapGet("/{id:int}", async (int id, [FromServices] TasaImpuestoService service) =>
        {
            var tasa = await service.ObtenerPorIdAsync(id);
            return tasa is null ? Results.NotFound() : Results.Ok(tasa);
        });

        group.MapPost("/", async (TasaImpuestoCreateDto dto, [FromServices] TasaImpuestoService service) =>
        {
            try
            {
                var id = await service.CrearAsync(dto);
                return Results.Created($"/api/impuestos/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        group.MapPut("/{id:int}", async (int id, TasaImpuestoUpdateDto dto, [FromServices] TasaImpuestoService service) =>
        {
            try
            {
                var ok = await service.ActualizarAsync(id, dto);
                return ok ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        group.MapDelete("/{id:int}", async (int id, [FromServices] TasaImpuestoService service) =>
        {
            var ok = await service.EliminarAsync(id);
            return ok ? Results.NoContent() : Results.NotFound();
        });
    }
}
