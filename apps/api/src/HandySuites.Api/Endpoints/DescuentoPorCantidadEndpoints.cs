using FluentValidation;
using HandySuites.Api.Hubs;
using HandySuites.Application.Descuentos.DTOs;
using HandySuites.Application.Descuentos.Services;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

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

        app.MapPost("/descuentos", async (
            DescuentoPorCantidadCreateDto dto,
            IValidator<DescuentoPorCantidadCreateDto> validator,
            [FromServices] DescuentoPorCantidadService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearDescuentoAsync(dto);
                await NotifyDescuentosActualizados(hubContext, currentTenant.TenantId);
                return Results.Created($"/descuentos/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPut("/descuentos/{id:int}", async (
            int id,
            DescuentoPorCantidadCreateDto dto,
            IValidator<DescuentoPorCantidadCreateDto> validator,
            [FromServices] DescuentoPorCantidadService servicio,
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
                var actualizado = await servicio.ActualizarDescuentoAsync(id, dto);
                if (actualizado)
                    await NotifyDescuentosActualizados(hubContext, currentTenant.TenantId);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapDelete("/descuentos/{id:int}", async (
            int id,
            [FromServices] DescuentoPorCantidadService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var eliminado = await servicio.EliminarDescuentoAsync(id);
            if (eliminado)
                await NotifyDescuentosActualizados(hubContext, currentTenant.TenantId);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/descuentos/{id:int}/toggle", async (
            int id,
            [FromServices] DescuentoPorCantidadService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var actualizado = await servicio.ToggleActivoAsync(id);
            if (actualizado)
                await NotifyDescuentosActualizados(hubContext, currentTenant.TenantId);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        // Batch toggle - habilitar/deshabilitar múltiples descuentos
        app.MapPatch("/descuentos/batch-toggle", async (
            BatchToggleRequest request,
            [FromServices] DescuentoPorCantidadService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var actualizados = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            if (actualizados > 0)
                await NotifyDescuentosActualizados(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizados });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));
    }

    private static async Task NotifyDescuentosActualizados(IHubContext<NotificationHub> hubContext, int tenantId)
    {
        try
        {
            await hubContext.Clients.Group($"tenant:{tenantId}").SendAsync("DescuentosActualizados");
        }
        catch
        {
            // ignore — fallo de hub no debe romper el request
        }
    }
}

public record BatchToggleRequest(List<int> Ids, bool Activo);
