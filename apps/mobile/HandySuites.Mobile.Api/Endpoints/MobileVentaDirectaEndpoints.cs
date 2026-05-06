using System.Net.Http.Json;
using System.Security.Claims;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.MovimientosInventario.DTOs;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileVentaDirectaEndpoints
{
    private const int MaxRetries = 3;

    public static void MapMobileVentaDirectaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/venta-directa")
            .RequireAuthorization()
            .WithTags("Venta Directa")
            .WithOpenApi();

        group.MapPost("/", async (
            VentaDirectaRequest request,
            [FromServices] HandySuitesDbContext db,
            [FromServices] ITransactionManager txManager,
            [FromServices] MovimientoInventarioService movimientoService,
            [FromServices] IHttpClientFactory httpClientFactory,
            [FromServices] IConfiguration config,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tenantIdClaim))
                return Results.Unauthorized();

            if (!int.TryParse(userIdClaim, out var usuarioId) || !int.TryParse(tenantIdClaim, out var tenantId))
                return Results.Unauthorized();

            var cliente = await db.Clientes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.ClienteId && c.TenantId == tenantId && c.Activo);

            if (cliente == null)
                return Results.BadRequest(new { success = false, message = "Cliente no encontrado" });

            if (request.Items == null || request.Items.Count == 0)
                return Results.BadRequest(new { success = false, message = "Se requiere al menos un producto" });

            foreach (var item in request.Items)
            {
                if (item.Cantidad <= 0)
                    return Results.BadRequest(new { success = false, message = $"Cantidad del producto {item.ProductoId} debe ser mayor a cero" });
            }

            // Detalles duplicados (mismo productoId 2+ veces): rechazar para que cada SALIDA
            // se haga una sola vez por producto. Igual que PedidoService.CrearAsync.
            var duplicados = request.Items.GroupBy(i => i.ProductoId).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
            if (duplicados.Count > 0)
                return Results.BadRequest(new { success = false, message = $"El pedido contiene productos duplicados (IDs: {string.Join(", ", duplicados)}). Consolida la cantidad en una sola línea." });

            // Calcular subtotal/total con precio del servidor (anti-tampering — el cliente no puede mandar precios falsos)
            var fecha = DateTime.UtcNow;
            decimal subtotal = 0;
            var detalles = new List<DetallePedido>();

            foreach (var item in request.Items)
            {
                var producto = await db.Productos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == item.ProductoId && p.TenantId == tenantId && p.Activo);

                if (producto == null)
                    return Results.BadRequest(new { success = false, message = $"Producto {item.ProductoId} no encontrado o desactivado" });

                var precioUnitario = producto.PrecioBase;
                var lineSubtotal = precioUnitario * item.Cantidad;
                var lineImpuesto = lineSubtotal * 0.16m;
                var lineTotal = lineSubtotal + lineImpuesto;

                detalles.Add(new DetallePedido
                {
                    ProductoId = item.ProductoId,
                    Cantidad = item.Cantidad,
                    PrecioUnitario = precioUnitario,
                    Descuento = 0,
                    PorcentajeDescuento = 0,
                    Subtotal = lineSubtotal,
                    Impuesto = lineImpuesto,
                    Total = lineTotal,
                    Notas = item.Notas,
                    Activo = true,
                    CreadoEn = fecha,
                    CreadoPor = usuarioId.ToString()
                });

                subtotal += lineSubtotal;
            }

            var impuestos = subtotal * 0.16m;
            var total = subtotal + impuestos;

            if (request.Monto < total)
                return Results.BadRequest(new { success = false, message = $"Monto de pago ({request.Monto:C}) es menor al total ({total:C})" });

            // Transacción atómica: Pedido + DetallePedidos + MovimientosInventario(SALIDA) + Cobro.
            //
            // ITransactionManager.ExecuteInTransactionAsync envuelve todo en una ExecutionStrategy
            // compatible con EnableRetryOnFailure. MovimientoInventarioService.CrearMovimientoAsync
            // detecta la transacción en curso y se ejecuta inline (no anida transacciones).
            //
            // Si CUALQUIER paso falla (stock insuficiente al adquirir el lock, race en NumeroPedido,
            // error de DB, etc.) → throw → rollback de TODO. No quedan pedidos/cobros/movimientos
            // huérfanos.
            for (int attempt = 0; attempt < MaxRetries; attempt++)
            {
                try
                {
                    var resultado = await txManager.ExecuteInTransactionAsync(async () =>
                    {
                        var prefijo = $"VD-{fecha:yyyyMMdd}";
                        var ultimoNumero = await db.Pedidos
                            .Where(p => p.TenantId == tenantId && p.NumeroPedido.StartsWith(prefijo))
                            .OrderByDescending(p => p.NumeroPedido)
                            .Select(p => p.NumeroPedido)
                            .FirstOrDefaultAsync();

                        int secuencia = 1;
                        if (!string.IsNullOrEmpty(ultimoNumero))
                        {
                            var partes = ultimoNumero.Split('-');
                            if (partes.Length == 3 && int.TryParse(partes[2], out var num))
                                secuencia = num + 1;
                        }
                        var numeroPedido = $"{prefijo}-{secuencia:D4}";

                        var pedido = new Pedido
                        {
                            TenantId = tenantId,
                            ClienteId = request.ClienteId,
                            UsuarioId = usuarioId,
                            NumeroPedido = numeroPedido,
                            FechaPedido = fecha,
                            Estado = EstadoPedido.Entregado,
                            TipoVenta = TipoVenta.VentaDirecta,
                            Subtotal = subtotal,
                            Descuento = 0,
                            Impuestos = impuestos,
                            Total = total,
                            Notas = request.Notas,
                            Activo = true,
                            CreadoEn = fecha,
                            CreadoPor = usuarioId.ToString()
                        };

                        db.Pedidos.Add(pedido);
                        await db.SaveChangesAsync();

                        foreach (var detalle in detalles)
                        {
                            detalle.PedidoId = pedido.Id;
                            db.DetallePedidos.Add(detalle);
                        }
                        await db.SaveChangesAsync();

                        // Movimientos SALIDA — descuenta inventario y deja audit trail.
                        // Re-valida stock dentro del advisory lock per-producto (ver
                        // MovimientoInventarioService:45). Si otra venta concurrente vació
                        // el stock entre validación inicial y commit, aquí throw → rollback.
                        foreach (var detalle in detalles)
                        {
                            var (_, success, error) = await movimientoService.CrearMovimientoAsync(new MovimientoInventarioCreateDto
                            {
                                ProductoId = detalle.ProductoId,
                                TipoMovimiento = "SALIDA",
                                Cantidad = detalle.Cantidad,
                                Motivo = "VENTA",
                                Comentario = $"Venta directa - Pedido #{pedido.Id}"
                            });

                            if (!success)
                                throw new InvalidOperationException(error ?? "Error al descontar inventario");
                        }

                        var cobro = new Cobro
                        {
                            TenantId = tenantId,
                            PedidoId = pedido.Id,
                            ClienteId = request.ClienteId,
                            UsuarioId = usuarioId,
                            Monto = total,
                            MetodoPago = (MetodoPago)request.MetodoPago,
                            FechaCobro = fecha,
                            Referencia = request.Referencia,
                            Notas = request.Notas,
                            Activo = true,
                            CreadoEn = fecha,
                            CreadoPor = usuarioId.ToString()
                        };

                        db.Cobros.Add(cobro);
                        await db.SaveChangesAsync();

                        // Tracking de carga: si el vendedor tiene una ruta activa
                        // (EnProgreso=1 o CargaAceptada=5) y el producto está en
                        // RutasCarga de esa ruta, incrementar CantidadVendida para
                        // que el progreso se refleje en mobile sin esperar al cierre.
                        // Reportado 2026-05-05: el progreso de ruta de venta libre
                        // mostraba 0/0 aunque el vendedor sí estaba vendiendo.
                        var rutaActiva = await db.RutasVendedor
                            .Where(r => r.UsuarioId == usuarioId
                                     && r.TenantId == tenantId
                                     && r.Activo
                                     && (r.Estado == EstadoRuta.EnProgreso || r.Estado == EstadoRuta.CargaAceptada))
                            .Select(r => (int?)r.Id)
                            .FirstOrDefaultAsync();
                        if (rutaActiva.HasValue)
                        {
                            foreach (var detalle in detalles)
                            {
                                var carga = await db.RutasCarga
                                    .FirstOrDefaultAsync(c => c.RutaId == rutaActiva.Value
                                        && c.ProductoId == detalle.ProductoId
                                        && c.TenantId == tenantId
                                        && c.Activo);
                                if (carga != null)
                                {
                                    carga.CantidadVendida += (int)detalle.Cantidad;
                                    carga.ActualizadoEn = DateTime.UtcNow;
                                }
                            }
                            await db.SaveChangesAsync();
                        }

                        return (pedido.Id, cobro.Id, numeroPedido, total);
                    });

                    // Notify Main API's SignalR hub (fire-and-forget — fuera de tx para que un notify lento no bloquee)
                    try
                    {
                        var mainClient = httpClientFactory.CreateClient("MainApi");
                        var notifyRequest = new HttpRequestMessage(HttpMethod.Post, "/api/internal/dashboard-notify");
                        notifyRequest.Headers.Add("X-Internal-Api-Key", config["InternalApiKey"] ?? throw new InvalidOperationException("InternalApiKey is not configured"));
                        notifyRequest.Content = JsonContent.Create(new { tipo = "pedido", id = resultado.Item1, tenantId });
                        await mainClient.SendAsync(notifyRequest);
                    }
                    catch { /* fire and forget */ }

                    return Results.Created($"/api/mobile/pedidos/{resultado.Item1}", new
                    {
                        success = true,
                        data = new
                        {
                            pedidoId = resultado.Item1,
                            cobroId = resultado.Item2,
                            numeroPedido = resultado.Item3,
                            total = resultado.Item4,
                            metodoPago = request.MetodoPago
                        }
                    });
                }
                catch (InvalidOperationException ex)
                {
                    // Stock insuficiente o inventario inexistente — no tiene sentido retry.
                    return Results.BadRequest(new { success = false, message = ex.Message });
                }
                catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pg && (pg.SqlState == "23505" || pg.SqlState == "40001"))
                {
                    // 23505 = unique violation (race en NumeroPedido) | 40001 = serialization failure → retry
                    if (attempt == MaxRetries - 1)
                        return Results.Conflict(new { success = false, message = "No se pudo generar un número de pedido único. Intente de nuevo." });
                }
            }

            return Results.StatusCode(500);
        })
        .WithSummary("Venta directa (pedido + cobro + descuento de inventario atómico)")
        .WithDescription("Crea Pedido (estado=Entregado, tipo=VentaDirecta), DetallePedidos, MovimientosInventario(SALIDA) y Cobro en una sola transacción. Si cualquier paso falla (stock insuficiente, conflicto de DB) toda la operación se revierte — no quedan pedidos/cobros/movimientos huérfanos.")
        .Produces<object>(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status400BadRequest);
    }
}

public class VentaDirectaRequest
{
    public int ClienteId { get; set; }
    public List<VentaDirectaItemRequest> Items { get; set; } = new();
    public int MetodoPago { get; set; } // 0=Efectivo, 1=Transferencia, etc.
    public decimal Monto { get; set; }
    public string? Referencia { get; set; }
    public string? Notas { get; set; }
}

public class VentaDirectaItemRequest
{
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal? PrecioUnitario { get; set; }
    public string? Notas { get; set; }
}
