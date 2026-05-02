using FluentValidation;
using HandySuites.Api.Hubs;
using HandySuites.Application.Precios.DTOs;
using HandySuites.Application.Precios.Services;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

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

        app.MapPost("/precios", async (
            PrecioPorProductoCreateDto dto,
            IValidator<PrecioPorProductoCreateDto> validator,
            [FromServices] PrecioPorProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearPrecioAsync(dto);
                await ListaPrecioEndpoints.NotifyListaPreciosActualizadas(hubContext, currentTenant.TenantId);
                return Results.Created($"/precios/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPut("/precios/{id:int}", async (
            int id,
            PrecioPorProductoCreateDto dto,
            IValidator<PrecioPorProductoCreateDto> validator,
            [FromServices] PrecioPorProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var actualizado = await servicio.ActualizarPrecioAsync(id, dto);
                if (actualizado)
                    await ListaPrecioEndpoints.NotifyListaPreciosActualizadas(hubContext, currentTenant.TenantId);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapDelete("/precios/{id:int}", async (
            int id,
            [FromServices] PrecioPorProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var eliminado = await servicio.EliminarPrecioAsync(id);
            if (eliminado)
                await ListaPrecioEndpoints.NotifyListaPreciosActualizadas(hubContext, currentTenant.TenantId);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));
    }
}
