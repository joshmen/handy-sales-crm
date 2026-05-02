using FluentValidation;
using HandySuites.Api.Hubs;
using HandySuites.Application.CategoriasProductos.DTOs;
using HandySuites.Application.CategoriasProductos.Services;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

public static class CategoriaProductoEndpoints
{
    public static void MapCategoriaProductoEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/categorias-productos", async ([FromQuery] bool? incluirInactivos, [FromServices] CategoriaProductoService servicio) =>
        {
            var categorias = await servicio.ObtenerCategoriasAsync(incluirInactivos ?? false);
            return Results.Ok(categorias);
        }).RequireAuthorization();

        app.MapGet("/categorias-productos/{id:int}", async (int id, [FromServices] CategoriaProductoService servicio) =>
        {
            var categoria = await servicio.ObtenerPorIdAsync(id);
            return categoria is null ? Results.NotFound() : Results.Ok(categoria);
        }).RequireAuthorization();

        app.MapPost("/categorias-productos", async (
            CategoriaProductoCreateDto dto,
            IValidator<CategoriaProductoCreateDto> validator,
            [FromServices] CategoriaProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearCategoriaAsync(dto);
                await NotifyCategoriasProductoActualizadas(hubContext, currentTenant.TenantId);
                return Results.Created($"/categorias-productos/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapPut("/categorias-productos/{id:int}", async (
            int id,
            CategoriaProductoCreateDto dto,
            IValidator<CategoriaProductoCreateDto> validator,
            [FromServices] CategoriaProductoService servicio,
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
                var actualizado = await servicio.ActualizarCategoriaAsync(id, dto);
                if (actualizado)
                    await NotifyCategoriasProductoActualizadas(hubContext, currentTenant.TenantId);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization();

        app.MapDelete("/categorias-productos/{id:int}", async (
            int id,
            [FromServices] CategoriaProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await servicio.EliminarCategoriaAsync(id);

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

            await NotifyCategoriasProductoActualizadas(hubContext, currentTenant.TenantId);
            return Results.NoContent();
        }).RequireAuthorization();

        app.MapPatch("/categorias-productos/{id:int}/activo", async (
            int id,
            [FromBody] CategoriaProductoCambiarActivoDto dto,
            [FromServices] CategoriaProductoService servicio,
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

            await NotifyCategoriasProductoActualizadas(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizado = true });
        }).RequireAuthorization();

        app.MapPatch("/categorias-productos/batch-toggle", async (
            CategoriaProductoBatchToggleRequest request,
            [FromServices] CategoriaProductoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var result = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);

            if (!result.Success)
                return Results.Conflict(new { message = result.Error, productosCount = result.ProductosCount });

            await NotifyCategoriasProductoActualizadas(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizados = request.Ids.Count });
        }).RequireAuthorization();
    }

    private static async Task NotifyCategoriasProductoActualizadas(IHubContext<NotificationHub> hubContext, int tenantId)
    {
        try
        {
            await hubContext.Clients.Group($"tenant:{tenantId}").SendAsync("CategoriasProductoActualizadas");
        }
        catch
        {
            // ignore
        }
    }
}

public record CategoriaProductoCambiarActivoDto(bool Activo);
public record CategoriaProductoBatchToggleRequest(List<int> Ids, bool Activo);
