using System.Net.Http.Json;
using System.Security.Claims;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Services;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobilePedidoEndpoints
{
    /// <summary>
    /// Sends a DashboardUpdate event to the Main API's SignalR hub so web clients receive real-time updates.
    /// Fire-and-forget: failures are logged but never block the response.
    /// </summary>
    private static async Task NotifyDashboard(IHttpClientFactory httpClientFactory, IConfiguration config, ITenantContextService tenant, string tipo, int id, ILogger? logger = null)
    {
        var tenantId = tenant.TenantId ?? 0;
        if (tenantId <= 0) return;

        try
        {
            var client = httpClientFactory.CreateClient("MainApi");
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/dashboard-notify");
            request.Headers.Add("X-Internal-Api-Key", config["InternalApiKey"] ?? throw new InvalidOperationException("InternalApiKey is not configured"));
            request.Content = JsonContent.Create(new { tipo, id, tenantId });
            await client.SendAsync(request);
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Failed to notify Main API dashboard for tenant={TenantId}, tipo={Tipo}, id={Id}", tenantId, tipo, id);
        }
    }

    /// <summary>
    /// Sends push notification to relevant users after order state change.
    /// Fire-and-forget: failures are logged but never block the response.
    ///
    /// IMPORTANT: creates an isolated DI scope for the background task. The request-scoped
    /// OrderNotificationHelper holds a DbContext that gets disposed when the endpoint returns;
    /// using that captured helper inside Task.Run causes ObjectDisposedException.
    /// </summary>
    private static async Task NotifyOrderPush(IServiceScopeFactory scopeFactory, HttpContext context, int pedidoId, EstadoPedido newState)
    {
        var tenantId = int.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tid) ? tid : 0;
        var userId = int.TryParse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? context.User.FindFirst("sub")?.Value, out var uid) ? uid : 0;
        if (tenantId <= 0 || userId <= 0) return;

        // Fire-and-forget with isolated scope — don't await in the request pipeline
        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var helper = scope.ServiceProvider.GetRequiredService<OrderNotificationHelper>();
            try { await helper.NotifyStateChangeAsync(pedidoId, tenantId, userId, newState); }
            catch { /* logged inside helper */ }
        });
    }

    public static void MapMobilePedidoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/pedidos")
            .RequireAuthorization()
            .WithTags("Pedidos")
            .WithOpenApi();

        // === CRUD BÁSICO ===

        group.MapPost("/", async (
            PedidoCreateDto dto,
            [FromServices] PedidoService servicio,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] IConfiguration config) =>
        {
            var id = await servicio.CrearAsync(dto);
            await NotifyDashboard(httpClientFactory, config, tenantContext, "pedido", id);
            return Results.Created($"/api/mobile/pedidos/{id}", new { success = true, data = new { id } });
        })
        .WithSummary("Crear pedido")
        .WithDescription("Crea un nuevo pedido con productos. Se crea en estado Borrador.")
        .Produces<object>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapGet("/mis-pedidos", async (
            [FromQuery] int? estado,
            [FromQuery] int? tipoVenta,
            [FromQuery] int pagina,
            [FromQuery] int porPagina,
            [FromServices] PedidoService servicio) =>
        {
            var pedidos = await servicio.ObtenerMisPedidosAsync();

            // Filtrar por estado si se proporciona
            if (estado.HasValue)
            {
                pedidos = pedidos.Where(p => (int)p.Estado == estado.Value).ToList();
            }

            // Filtrar por tipo de venta si se proporciona
            if (tipoVenta.HasValue)
            {
                pedidos = pedidos.Where(p => (int)p.TipoVenta == tipoVenta.Value).ToList();
            }

            var total = pedidos.Count;
            var paginaActual = pagina > 0 ? pagina : 1;
            var tamano = porPagina > 0 ? Math.Min(porPagina, 100) : 20;

            var paginados = pedidos
                .OrderByDescending(p => p.FechaPedido)
                .Skip((paginaActual - 1) * tamano)
                .Take(tamano)
                .ToList();

            return Results.Ok(new
            {
                success = true,
                data = paginados,
                pagination = new
                {
                    page = paginaActual,
                    pageSize = tamano,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / tamano)
                }
            });
        })
        .WithSummary("Mis pedidos")
        .WithDescription("Lista pedidos del vendedor autenticado con paginación y filtro de estado opcional.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var pedido = await servicio.ObtenerPorIdAsync(id);
            if (pedido is null)
                return Results.NotFound(new { success = false, message = "Pedido no encontrado" });

            return Results.Ok(new { success = true, data = pedido });
        })
        .WithSummary("Detalle de pedido")
        .WithDescription("Obtiene el detalle completo de un pedido incluyendo líneas de productos.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapGet("/cliente/{clienteId:int}", async (
            int clienteId,
            [FromServices] PedidoService servicio) =>
        {
            var pedidos = await servicio.ObtenerPorClienteAsync(clienteId);
            return Results.Ok(new { success = true, data = pedidos, count = pedidos.Count });
        })
        .WithSummary("Pedidos por cliente")
        .WithDescription("Lista todos los pedidos de un cliente específico.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapPut("/{id:int}", async (
            int id,
            PedidoUpdateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var actualizado = await servicio.ActualizarAsync(id, dto);
            if (!actualizado)
                return Results.NotFound(new { success = false, message = "Pedido no encontrado o no editable" });

            return Results.Ok(new { success = true, message = "Pedido actualizado" });
        })
        .WithSummary("Actualizar pedido")
        .WithDescription("Actualiza datos del pedido. Solo permitido en estado Borrador.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] PedidoService servicio) =>
        {
            var eliminado = await servicio.EliminarAsync(id);
            if (!eliminado)
                return Results.NotFound(new { success = false, message = "Pedido no encontrado o no eliminable" });

            return Results.Ok(new { success = true, message = "Pedido eliminado" });
        })
        .WithSummary("Eliminar pedido")
        .WithDescription("Elimina un pedido. Solo permitido en estado Borrador.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        // === CAMBIOS DE ESTADO — Simplified flow: Borrador → Confirmado → EnRuta → Entregado + Cancelado ===

        // Legacy endpoint for backwards compatibility — redirects to ConfirmarAsync
        group.MapPost("/{id:int}/enviar", async (
            int id,
            HttpContext context,
            [FromServices] PedidoService servicio,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] IConfiguration config,
            [FromServices] IServiceScopeFactory scopeFactory) =>
        {
            var resultado = await servicio.ConfirmarAsync(id);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo confirmar el pedido" });

            await NotifyDashboard(httpClientFactory, config, tenantContext, "pedido", id);
            await NotifyOrderPush(scopeFactory, context, id, EstadoPedido.Confirmado);
            return Results.Ok(new { success = true, message = "Pedido confirmado" });
        })
        .WithSummary("[Legacy] Enviar pedido → Confirmar")
        .WithDescription("Legacy: redirige a Confirmar. Cambia el estado de Borrador a Confirmado.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/{id:int}/cancelar", async (
            int id,
            HttpContext context,
            [FromBody] CancelarPedidoDto? dto,
            [FromServices] PedidoService servicio,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] IConfiguration config,
            [FromServices] IServiceScopeFactory scopeFactory) =>
        {
            var resultado = await servicio.CancelarAsync(id, dto?.Motivo);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo cancelar el pedido" });

            await NotifyDashboard(httpClientFactory, config, tenantContext, "pedido", id);
            await NotifyOrderPush(scopeFactory, context, id, EstadoPedido.Cancelado);
            return Results.Ok(new { success = true, message = "Pedido cancelado" });
        })
        .WithSummary("Cancelar pedido")
        .WithDescription("Cancela el pedido. Se requiere motivo de cancelación.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/{id:int}/confirmar", async (
            int id,
            HttpContext context,
            [FromServices] PedidoService servicio,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] IConfiguration config,
            [FromServices] IServiceScopeFactory scopeFactory) =>
        {
            var resultado = await servicio.ConfirmarAsync(id);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo confirmar el pedido" });

            await NotifyDashboard(httpClientFactory, config, tenantContext, "pedido", id);
            await NotifyOrderPush(scopeFactory, context, id, EstadoPedido.Confirmado);
            return Results.Ok(new { success = true, message = "Pedido confirmado" });
        })
        .WithSummary("Confirmar pedido")
        .WithDescription("Cambia estado de Borrador a Confirmado.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        // Endpoints /procesar y /en-ruta REMOVIDOS de la mobile API (2026-04-27).
        // Poner pedido EnRuta es responsabilidad exclusiva del admin/supervisor desde
        // el dashboard web — requiere asignar el pedido a una RutaVendedor activa
        // (validación BR-RUTA-EnRuta en PedidoRepository.CambiarEstadoDetalladoAsync).
        // El vendedor en mobile no debería tener este botón; si llega un cliente con
        // el endpoint cacheado recibirá 404, lo cual es preferible a 400 confuso.

        group.MapPost("/{id:int}/entregar", async (
            int id,
            HttpContext context,
            [FromBody] EntregarPedidoDto? dto,
            [FromServices] PedidoService servicio,
            [FromServices] ITenantContextService tenantContext,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] IConfiguration config,
            [FromServices] IServiceScopeFactory scopeFactory,
            [FromServices] HandySuitesDbContext db) =>
        {
            var resultado = await servicio.EntregarAsync(id, dto?.NotasEntrega);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo entregar el pedido" });

            await NotifyDashboard(httpClientFactory, config, tenantContext, "pedido", id);
            await NotifyOrderPush(scopeFactory, context, id, EstadoPedido.Entregado);

            // Check stock levels after delivery — fire-and-forget with isolated DI scope
            var tenantId = int.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tid) ? tid : 0;
            if (tenantId > 0)
            {
                _ = Task.Run(async () =>
                {
                    using var scope = scopeFactory.CreateScope();
                    var stockNotifier = scope.ServiceProvider.GetRequiredService<StockNotificationService>();
                    try { await stockNotifier.CheckAndNotifyLowStockAsync(id, tenantId); }
                    catch { /* logged inside service */ }
                });

                // Tracking de carga: si el pedido está asignado a una ruta activa,
                // incrementar RutaCarga.CantidadEntregada por cada producto del
                // pedido. Permite reflejar el progreso en mobile y pre-rellenar
                // el cierre sin captura manual.
                var rutaPedido = await db.RutasPedidos
                    .AsNoTracking()
                    .Where(rp => rp.PedidoId == id && rp.Activo)
                    .Select(rp => new { rp.RutaId })
                    .FirstOrDefaultAsync();
                if (rutaPedido != null)
                {
                    var detalles = await db.DetallePedidos
                        .AsNoTracking()
                        .Where(d => d.PedidoId == id && d.Activo)
                        .Select(d => new { d.ProductoId, d.Cantidad })
                        .ToListAsync();
                    foreach (var det in detalles)
                    {
                        var carga = await db.RutasCarga
                            .FirstOrDefaultAsync(c => c.RutaId == rutaPedido.RutaId
                                && c.ProductoId == det.ProductoId
                                && c.TenantId == tenantId
                                && c.Activo);
                        if (carga != null)
                        {
                            carga.CantidadEntregada += (int)det.Cantidad;
                            carga.ActualizadoEn = DateTime.UtcNow;
                        }
                    }
                    await db.SaveChangesAsync();
                }
            }

            return Results.Ok(new { success = true, message = "Pedido entregado" });
        })
        .WithSummary("Entregar pedido")
        .WithDescription("Cambia estado de EnRuta a Entregado. Acepta notas de entrega opcionales.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        // === GESTIÓN DE DETALLES ===

        group.MapPost("/{pedidoId:int}/productos", async (
            int pedidoId,
            DetallePedidoCreateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.AgregarDetalleAsync(pedidoId, dto);
            if (!resultado)
                return Results.BadRequest(new { success = false, message = "No se pudo agregar el producto" });

            return Results.Ok(new { success = true, message = "Producto agregado al pedido" });
        })
        .WithSummary("Agregar producto al pedido")
        .WithDescription("Agrega una línea de producto. Solo permitido en estado Borrador.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        group.MapPut("/{pedidoId:int}/productos/{detalleId:int}", async (
            int pedidoId,
            int detalleId,
            DetallePedidoCreateDto dto,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.ActualizarDetalleAsync(pedidoId, detalleId, dto);
            if (!resultado)
                return Results.NotFound(new { success = false, message = "Detalle no encontrado" });

            return Results.Ok(new { success = true, message = "Producto actualizado" });
        })
        .WithSummary("Actualizar producto del pedido")
        .WithDescription("Actualiza cantidad, precio o descuento de una línea.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{pedidoId:int}/productos/{detalleId:int}", async (
            int pedidoId,
            int detalleId,
            [FromServices] PedidoService servicio) =>
        {
            var resultado = await servicio.EliminarDetalleAsync(pedidoId, detalleId);
            if (!resultado)
                return Results.NotFound(new { success = false, message = "Detalle no encontrado" });

            return Results.Ok(new { success = true, message = "Producto eliminado del pedido" });
        })
        .WithSummary("Eliminar producto del pedido")
        .WithDescription("Elimina una línea de producto del pedido.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);
    }
}

public record CancelarPedidoDto(string? Motivo);
public record EntregarPedidoDto(string? NotasEntrega);
