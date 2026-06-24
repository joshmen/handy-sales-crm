using FluentValidation;
using HandySuites.Api.Hubs;
using HandySuites.Application.Vehiculos.DTOs;
using HandySuites.Application.Vehiculos.Services;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

public static class VehiculoEndpoints
{
    public static void MapVehiculoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vehicles").RequireAuthorization();

        // Lectura: cualquier usuario autenticado (Admin/Supervisor/SuperAdmin/Vendedor).
        group.MapGet("/", async ([FromServices] VehiculoService servicio) =>
        {
            var vehiculos = await servicio.ObtenerVehiculosAsync();
            return Results.Ok(vehiculos);
        });

        group.MapGet("/{id:int}", async (int id, [FromServices] VehiculoService servicio) =>
        {
            var vehiculo = await servicio.ObtenerPorIdAsync(id);
            return vehiculo is null ? Results.NotFound() : Results.Ok(vehiculo);
        });

        // Escritura: solo Admin / SuperAdmin (igual que Zona).
        group.MapPost("/", async (
            CreateVehiculoDto dto,
            IValidator<CreateVehiculoDto> validator,
            [FromServices] VehiculoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext,
            HttpContext context) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var usuario = context.User.Identity?.Name ?? "sistema";
            var result = await servicio.CrearVehiculoAsync(dto, usuario);
            if (!result.Success)
                return Results.BadRequest(new { error = result.Error });
            await NotifyVehiculosActualizados(hubContext, currentTenant.TenantId);
            return Results.Created($"/api/vehicles/{result.Id}", new { id = result.Id });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        group.MapPut("/{id:int}", async (
            int id,
            UpdateVehiculoDto dto,
            IValidator<UpdateVehiculoDto> validator,
            [FromServices] VehiculoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext,
            HttpContext context) =>
        {
            var exists = await servicio.ObtenerPorIdAsync(id);
            if (exists == null)
                return Results.NotFound();

            // El Id viene de la URL; asignarlo al DTO antes del validator (que requiere Id > 0).
            dto.Id = id;

            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var usuario = context.User.Identity?.Name ?? "sistema";
            var result = await servicio.ActualizarVehiculoAsync(id, dto, usuario);
            if (!result.Success)
                return Results.BadRequest(new { error = result.Error });
            await NotifyVehiculosActualizados(hubContext, currentTenant.TenantId);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] VehiculoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await servicio.EliminarVehiculoAsync(id);
            if (!result.Success)
                return Results.NotFound(new { message = result.Error });

            await NotifyVehiculosActualizados(hubContext, currentTenant.TenantId);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        group.MapPatch("/{id:int}/activo", async (
            int id,
            [FromBody] VehiculoCambiarActivoDto dto,
            [FromServices] VehiculoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var result = await servicio.CambiarActivoAsync(id, dto.Activo);
            if (!result.Success)
                return Results.NotFound(new { message = result.Error });

            await NotifyVehiculosActualizados(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizado = true });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        group.MapPatch("/batch-toggle", async (
            VehiculoBatchToggleRequest request,
            [FromServices] VehiculoService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Se requiere al menos un ID" });

            var result = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            if (!result.Success)
                return Results.Conflict(new { message = result.Error });

            await NotifyVehiculosActualizados(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizados = request.Ids.Count });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));
    }

    private static async Task NotifyVehiculosActualizados(IHubContext<NotificationHub> hubContext, int tenantId)
    {
        try
        {
            await hubContext.Clients.Group($"tenant:{tenantId}").SendAsync("VehiculosActualizados");
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning(ex, "SignalR emit {Event} falló para tenant {TenantId}", "VehiculosActualizados", tenantId);
        }
    }
}

public record VehiculoCambiarActivoDto(bool Activo);
public record VehiculoBatchToggleRequest(List<int> Ids, bool Activo);
