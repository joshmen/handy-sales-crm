using FluentValidation;
using HandySuites.Api.Hubs;
using HandySuites.Application.FamiliasProductos.DTOs;
using HandySuites.Application.FamiliasProductos.Services;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

public static class FamiliasProductosEndpoints
{
    public static void MapFamiliasProductosEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/familias-productos", async (
            FamiliaProductoCreateDto dto,
            IValidator<FamiliaProductoCreateDto> validator,
            [FromServices] FamiliaProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearFamiliaAsync(dto);
                await NotifyFamiliasProductoActualizadas(hubContext, currentTenant.TenantId);
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
            [FromServices] FamiliaProductoService servicio,
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
                var actualizado = await servicio.ActualizarFamiliaAsync(id, dto);
                if (actualizado)
                    await NotifyFamiliasProductoActualizadas(hubContext, currentTenant.TenantId);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapDelete("/familias-productos/{id:int}", async (
            int id,
            [FromServices] FamiliaProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
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

            await NotifyFamiliasProductoActualizadas(hubContext, currentTenant.TenantId);
            return Results.NoContent();
        }).RequireAuthorization();

        app.MapPatch("/familias-productos/{id:int}/activo", async (
            int id,
            [FromBody] FamiliaCambiarActivoDto dto,
            [FromServices] FamiliaProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await servicio.CambiarActivoAsync(id, dto.Activo);

            if (!result.Success)
            {
                if (result.ProductosCount > 0)
                    return Results.Conflict(new { message = result.Error, productosCount = result.ProductosCount });
                return Results.NotFound(new { message = result.Error });
            }

            await NotifyFamiliasProductoActualizadas(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizado = true });
        }).RequireAuthorization();

        app.MapPatch("/familias-productos/batch-toggle", async (
            FamiliaBatchToggleRequest request,
            [FromServices] FamiliaProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var result = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);

            if (!result.Success)
                return Results.Conflict(new { message = result.Error, productosCount = result.ProductosCount });

            await NotifyFamiliasProductoActualizadas(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizados = request.Ids.Count });
        }).RequireAuthorization();
    }

    private static async Task NotifyFamiliasProductoActualizadas(IHubContext<NotificationHub> hubContext, int tenantId)
    {
        try
        {
            await hubContext.Clients.Group($"tenant:{tenantId}").SendAsync("FamiliasProductoActualizadas");
        }
        catch
        {
            // ignore
        }
    }
}

public record FamiliaCambiarActivoDto(bool Activo);
public record FamiliaBatchToggleRequest(List<int> Ids, bool Activo);
