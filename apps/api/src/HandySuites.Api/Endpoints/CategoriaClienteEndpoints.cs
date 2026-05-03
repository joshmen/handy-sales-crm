using FluentValidation;
using HandySuites.Api.Hubs;
using HandySuites.Application.CategoriasClientes.DTOs;
using HandySuites.Application.CategoriasClientes.Services;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

public static class CategoriaClienteEndpoints
{
    public static void MapCategoriaClienteEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/categorias-clientes", async ([FromServices] CategoriaClienteService servicio) =>
        {
            var categorias = await servicio.ObtenerCategoriasAsync();
            return Results.Ok(categorias);
        }).RequireAuthorization();

        app.MapGet("/categorias-clientes/{id:int}", async (int id, [FromServices] CategoriaClienteService servicio) =>
        {
            var categoria = await servicio.ObtenerPorIdAsync(id);
            return categoria is null ? Results.NotFound() : Results.Ok(categoria);
        }).RequireAuthorization();

        app.MapPost("/categorias-clientes", async (
            CategoriaClienteCreateDto dto,
            IValidator<CategoriaClienteCreateDto> validator,
            [FromServices] CategoriaClienteService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var id = await servicio.CrearCategoriaAsync(dto);
            await NotifyCategoriasClienteActualizadas(hubContext, currentTenant.TenantId);
            return Results.Created($"/categorias-clientes/{id}", new { id });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPut("/categorias-clientes/{id:int}", async (
            int id,
            CategoriaClienteCreateDto dto,
            IValidator<CategoriaClienteCreateDto> validator,
            [FromServices] CategoriaClienteService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var actualizado = await servicio.ActualizarCategoriaAsync(id, dto);
            if (actualizado)
                await NotifyCategoriasClienteActualizadas(hubContext, currentTenant.TenantId);
            return actualizado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapDelete("/categorias-clientes/{id:int}", async (
            int id,
            [FromServices] CategoriaClienteService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await servicio.EliminarCategoriaAsync(id);

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

            await NotifyCategoriasClienteActualizadas(hubContext, currentTenant.TenantId);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/categorias-clientes/{id:int}/activo", async (
            int id,
            [FromBody] CategoriaClienteCambiarActivoDto dto,
            [FromServices] CategoriaClienteService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await servicio.CambiarActivoAsync(id, dto.Activo);

            if (!result.Success)
            {
                if (result.ClientesCount > 0)
                    return Results.Conflict(new { message = result.Error, clientesCount = result.ClientesCount });
                return Results.NotFound(new { message = result.Error });
            }

            await NotifyCategoriasClienteActualizadas(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizado = true });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/categorias-clientes/batch-toggle", async (
            CategoriaClienteBatchToggleRequest request,
            [FromServices] CategoriaClienteService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var result = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);

            if (!result.Success)
                return Results.Conflict(new { message = result.Error, clientesCount = result.ClientesCount });

            await NotifyCategoriasClienteActualizadas(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizados = request.Ids.Count });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));
    }

    private static async Task NotifyCategoriasClienteActualizadas(IHubContext<NotificationHub> hubContext, int tenantId)
    {
        try
        {
            await hubContext.Clients.Group($"tenant:{tenantId}").SendAsync("CategoriasClienteActualizadas");
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning(ex, "SignalR emit {Event} falló para tenant {TenantId}", "CategoriasClienteActualizadas", tenantId);
        }
    }
}

public record CategoriaClienteCambiarActivoDto(bool Activo);
public record CategoriaClienteBatchToggleRequest(List<int> Ids, bool Activo);
