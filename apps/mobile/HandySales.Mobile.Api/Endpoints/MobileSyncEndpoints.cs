using HandySales.Application.Sync.DTOs;
using HandySales.Application.Sync.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileSyncEndpoints
{
    public static void MapMobileSyncEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/sync")
            .RequireAuthorization()
            .WithTags("Sincronización")
            .WithOpenApi();

        group.MapPost("/", async (
            [FromBody] SyncRequestDto request,
            [FromServices] SyncService servicio) =>
        {
            var response = await servicio.SyncAsync(request);
            return Results.Ok(new { success = true, data = response });
        })
        .WithSummary("Sincronización bidireccional")
        .WithDescription("Sincroniza cambios entre el dispositivo móvil y el servidor. Envía cambios locales y recibe cambios del servidor.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/pull", async (
            [FromBody] SyncPullRequest? request,
            [FromServices] SyncService servicio) =>
        {
            var syncRequest = new SyncRequestDto
            {
                LastSyncTimestamp = request?.LastSyncTimestamp,
                EntityTypes = request?.EntityTypes ?? new List<string>(),
                ClientChanges = null
            };

            var response = await servicio.SyncAsync(syncRequest);
            return Results.Ok(new
            {
                success = true,
                data = response.ServerChanges,
                summary = response.Summary,
                serverTimestamp = response.ServerTimestamp
            });
        })
        .WithSummary("Descargar cambios del servidor")
        .WithDescription("Obtiene cambios del servidor desde la última sincronización. Útil para sincronización inicial o recuperación.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapPost("/push", async (
            [FromBody] SyncChangesDto changes,
            [FromServices] SyncService servicio) =>
        {
            var syncRequest = new SyncRequestDto
            {
                LastSyncTimestamp = null,
                EntityTypes = new List<string>(),
                ClientChanges = changes
            };

            var response = await servicio.SyncAsync(syncRequest);
            return Results.Ok(new
            {
                success = true,
                conflicts = response.Conflicts,
                errors = response.Errors,
                summary = response.Summary,
                serverTimestamp = response.ServerTimestamp
            });
        })
        .WithSummary("Subir cambios al servidor")
        .WithDescription("Sube cambios locales al servidor. Retorna conflictos y errores si los hay.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("/status", (HttpContext context) =>
        {
            return Results.Ok(new
            {
                success = true,
                data = new
                {
                    serverTime = DateTime.UtcNow,
                    supportedEntityTypes = new[] { "clientes", "productos", "pedidos", "visitas", "rutas" },
                    syncVersion = "1.0"
                }
            });
        })
        .WithSummary("Estado del servicio de sincronización")
        .WithDescription("Verifica el estado del servicio de sincronización y obtiene información de configuración.")
        .Produces<object>(StatusCodes.Status200OK);
    }
}

public class SyncPullRequest
{
    public DateTime? LastSyncTimestamp { get; set; }
    public List<string>? EntityTypes { get; set; }
}
