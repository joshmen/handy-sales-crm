using HandySales.Application.Sync.DTOs;
using HandySales.Application.Sync.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class SyncEndpoints
{
    public static void MapSyncEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/sync").RequireAuthorization();

        // Main sync endpoint - bidirectional sync
        group.MapPost("/", async (
            SyncRequestDto request,
            [FromServices] SyncService servicio) =>
        {
            var response = await servicio.SyncAsync(request);
            return Results.Ok(response);
        })
        .WithName("Sync")
        .WithDescription("Bidirectional sync for mobile devices. Pushes client changes and pulls server changes.")
        .Produces<SyncResponseDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Pull-only sync (for initial sync or when no local changes)
        group.MapGet("/pull", async (
            DateTime? lastSyncTimestamp,
            string? entityTypes,
            [FromServices] SyncService servicio) =>
        {
            var request = new SyncRequestDto
            {
                LastSyncTimestamp = lastSyncTimestamp,
                EntityTypes = string.IsNullOrEmpty(entityTypes)
                    ? null
                    : entityTypes.Split(',').ToList()
            };

            var response = await servicio.SyncAsync(request);
            return Results.Ok(response);
        })
        .WithName("SyncPull")
        .WithDescription("Pull-only sync to get server changes without pushing local changes.")
        .Produces<SyncResponseDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        // Get sync status
        group.MapGet("/status", (
            [FromServices] SyncService servicio) =>
        {
            return Results.Ok(new
            {
                serverTimestamp = DateTime.UtcNow,
                supportedEntityTypes = new[] { "clientes", "productos", "pedidos", "visitas", "rutas" },
                version = "1.0"
            });
        })
        .WithName("SyncStatus")
        .WithDescription("Get sync service status and supported entity types.")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);
    }
}
