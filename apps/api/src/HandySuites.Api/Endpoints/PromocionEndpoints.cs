using FluentValidation;
using HandySuites.Api.Hubs;
using HandySuites.Application.Promociones.DTOs;
using HandySuites.Application.Promociones.Services;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

public static class PromocionesEndpoints
{
    public static void MapPromocionesEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/promociones", async ([FromServices] PromocionService servicio) =>
        {
            var promos = await servicio.ObtenerPromocionesAsync();
            return Results.Ok(promos);
        }).RequireAuthorization();

        app.MapGet("/promociones/{id:int}", async (int id, [FromServices] PromocionService servicio) =>
        {
            var promo = await servicio.ObtenerPorIdAsync(id);
            return promo is null ? Results.NotFound() : Results.Ok(promo);
        }).RequireAuthorization();

        app.MapPost("/promociones", async (
            PromocionCreateDto dto,
            IValidator<PromocionCreateDto> validator,
            [FromServices] PromocionService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            try
            {
                var id = await servicio.CrearPromocionAsync(dto);
                await NotifyPromocionesActualizadas(hubContext, currentTenant.TenantId);
                return Results.Created($"/promociones/{id}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPut("/promociones/{id:int}", async (
            int id,
            PromocionCreateDto dto,
            IValidator<PromocionCreateDto> validator,
            [FromServices] PromocionService servicio,
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
                var actualizado = await servicio.ActualizarPromocionAsync(id, dto);
                if (actualizado)
                    await NotifyPromocionesActualizadas(hubContext, currentTenant.TenantId);
                return actualizado ? Results.NoContent() : Results.NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return Results.Conflict(new { message = ex.Message });
            }
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapDelete("/promociones/{id:int}", async (
            int id,
            [FromServices] PromocionService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var eliminado = await servicio.EliminarPromocionAsync(id);
            if (eliminado)
                await NotifyPromocionesActualizadas(hubContext, currentTenant.TenantId);
            return eliminado ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/promociones/{id:int}/activo", async (
            int id,
            [FromBody] PromocionCambiarActivoDto dto,
            [FromServices] PromocionService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            var updated = await servicio.CambiarActivoAsync(id, dto.Activo);
            if (updated)
                await NotifyPromocionesActualizadas(hubContext, currentTenant.TenantId);
            return updated ? Results.Ok(new { actualizado = true }) : Results.NotFound();
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));

        app.MapPatch("/promociones/batch-toggle", async (
            [FromBody] PromocionBatchToggleRequest request,
            [FromServices] PromocionService servicio,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (request.Ids == null || request.Ids.Count == 0 || request.Ids.Count > 1000)
                return Results.BadRequest(new { error = "Lista de IDs inválida (máx. 1000)" });

            var count = await servicio.BatchToggleActivoAsync(request.Ids, request.Activo);
            if (count > 0)
                await NotifyPromocionesActualizadas(hubContext, currentTenant.TenantId);
            return Results.Ok(new { actualizados = count });
        }).RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN"));
    }

    // Emite evento al hub para que mobile invalide cache + dispare sync. Los
    // listeners están en `apps/mobile-app/src/hooks/useRealtime.ts` (mapa
    // CATALOG_EVENTS). Silently swallowea errores — no romper request por
    // un fallo de SignalR.
    private static async Task NotifyPromocionesActualizadas(IHubContext<NotificationHub> hubContext, int tenantId)
    {
        try
        {
            await hubContext.Clients.Group($"tenant:{tenantId}").SendAsync("PromocionesActualizadas");
        }
        catch (Exception ex)
        {
            // Loggeamos pero no propagamos — fallo de hub no debe romper el request
            // del admin. Logging vía Serilog static (configurado en Program.cs).
            Serilog.Log.Warning(ex, "SignalR emit {Event} falló para tenant {TenantId}", "PromocionesActualizadas", tenantId);
        }
    }
}

public record PromocionCambiarActivoDto(bool Activo);
public record PromocionBatchToggleRequest(List<int> Ids, bool Activo);
