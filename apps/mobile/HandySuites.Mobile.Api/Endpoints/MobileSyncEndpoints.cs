using System.Net.Http.Json;
using System.Security.Claims;
using HandySuites.Application.Sync.DTOs;
using HandySuites.Application.Sync.Services;
using HandySuites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileSyncEndpoints
{
    /// <summary>
    /// Fire-and-forget notification to Main API so web dashboard updates in real-time.
    /// Llama a /api/internal/sync-notify con el summary completo para que el hub emita
    /// PedidoCreated, CobroRegistrado y SyncCompleted (eventos que el web escucha).
    /// </summary>
    private static async Task NotifyMainApiAfterSync(
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ITenantContextService tenant,
        HttpContext httpContext,
        SyncSummaryDto? summary)
    {
        var tenantId = tenant.TenantId ?? 0;
        if (tenantId <= 0) return;
        if (summary == null) return;

        // Solo notificar si hay datos pusheados (decremento stock, pedido creado, etc.).
        var totalPushed = summary.PedidosPushed + summary.CobrosPushed + summary.VisitasPushed
                          + summary.ClientesPushed + summary.RutasPushed + summary.RutaDetallesPushed;
        if (totalPushed <= 0) return;

        var userIdClaim = httpContext.User.FindFirst("sub")?.Value
                         ?? httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        _ = int.TryParse(userIdClaim, out var userId);
        var userName = httpContext.User.FindFirst(ClaimTypes.Name)?.Value
                      ?? httpContext.User.FindFirst("name")?.Value
                      ?? httpContext.User.FindFirst(ClaimTypes.Email)?.Value
                      ?? string.Empty;

        try
        {
            var client = httpClientFactory.CreateClient("MainApi");
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/sync-notify");
            request.Headers.Add("X-Internal-Api-Key", config["InternalApiKey"] ?? throw new InvalidOperationException("InternalApiKey is not configured"));
            request.Content = JsonContent.Create(new
            {
                tenantId,
                userId,
                userName,
                summary = new
                {
                    pedidosCreados = summary.PedidosPushed,
                    pedidosActualizados = 0,
                    cobrosCreados = summary.CobrosPushed,
                    visitasCreadas = summary.VisitasPushed,
                    clientesCreados = summary.ClientesPushed,
                    totalPushed,
                    totalPulled = summary.ClientesPulled + summary.PedidosPulled
                                + summary.VisitasPulled + summary.RutasPulled + summary.ProductosPulled
                                + summary.CobrosPulled
                },
                timestamp = DateTime.UtcNow
            });
            await client.SendAsync(request);
        }
        catch { /* fire and forget */ }
    }

    public static void MapMobileSyncEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/sync")
            .RequireAuthorization()
            .WithTags("Sincronización")
            .WithOpenApi();

        group.MapPost("/", async (
            HttpContext httpContext,
            [FromBody] SyncRequestDto request,
            [FromServices] SyncService servicio,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] IConfiguration config) =>
        {
            var response = await servicio.SyncAsync(request);

            // Notify Main API if client pushed changes (pedidos, cobros, etc.)
            if (request.ClientChanges != null)
                await NotifyMainApiAfterSync(httpClientFactory, config, tenantContext, httpContext, response.Summary);

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
            HttpContext httpContext,
            [FromBody] SyncChangesDto changes,
            [FromServices] SyncService servicio,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] IConfiguration config) =>
        {
            var syncRequest = new SyncRequestDto
            {
                LastSyncTimestamp = null,
                EntityTypes = new List<string>(),
                ClientChanges = changes
            };

            var response = await servicio.SyncAsync(syncRequest);

            // Notify Main API that sync pushed data — manda el summary completo para
            // que el hub emita PedidoCreated/CobroRegistrado/SyncCompleted al web.
            await NotifyMainApiAfterSync(httpClientFactory, config, tenantContext, httpContext, response.Summary);

            return Results.Ok(new
            {
                success = true,
                data = response.ServerChanges,
                createdIdMappings = response.CreatedIdMappings,
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
