using System.Net.Http.Json;
using System.Security.Claims;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Mobile.Api.Endpoints;

// TODO: Refactor to use PedidoService instead of direct DbContext access.
// This endpoint bypasses business rules and validation in PedidoService.
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
            [FromServices] HandySalesDbContext db,
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

            // Validate client exists and belongs to tenant
            var cliente = await db.Clientes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.ClienteId && c.TenantId == tenantId && c.Activo);

            if (cliente == null)
                return Results.BadRequest(new { success = false, message = "Cliente no encontrado" });

            if (request.Items == null || request.Items.Count == 0)
                return Results.BadRequest(new { success = false, message = "Se requiere al menos un producto" });

            // Calculate totals before transaction to validate early
            var fecha = DateTime.UtcNow;
            decimal subtotal = 0;
            var detalles = new List<DetallePedido>();

            foreach (var item in request.Items)
            {
                if (item.Cantidad <= 0)
                    return Results.BadRequest(new { success = false, message = $"Cantidad del producto {item.ProductoId} debe ser mayor a cero" });
            }

            foreach (var item in request.Items)
            {
                var producto = await db.Productos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == item.ProductoId && p.TenantId == tenantId);

                if (producto == null)
                    return Results.BadRequest(new { success = false, message = $"Producto {item.ProductoId} no encontrado" });

                // Check inventory stock
                var inventario = await db.Inventarios
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.ProductoId == item.ProductoId && i.TenantId == tenantId);
                if (inventario != null && inventario.CantidadActual < item.Cantidad)
                    return Results.BadRequest(new { success = false,
                        message = $"Stock insuficiente para {producto.Nombre}: disponible {inventario.CantidadActual}, solicitado {item.Cantidad}" });

                // Always use server-side price to prevent client-side price tampering
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

            // Validate payment amount covers total
            if (request.Monto < total)
                return Results.BadRequest(new { success = false, message = $"Monto de pago ({request.Monto:C}) es menor al total ({total:C})" });

            // Create Pedido + Cobro atomically with retry for order number race condition
            for (int attempt = 0; attempt < MaxRetries; attempt++)
            {
                await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
                try
                {
                    // Generate order number inside transaction to prevent race conditions
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

                    await transaction.CommitAsync();

                    // Notify Main API's SignalR hub (fire-and-forget)
                    try
                    {
                        var mainClient = httpClientFactory.CreateClient("MainApi");
                        var notifyRequest = new HttpRequestMessage(HttpMethod.Post, "/api/internal/dashboard-notify");
                        notifyRequest.Headers.Add("X-Internal-Api-Key", config["InternalApiKey"] ?? "handy-internal-2024");
                        notifyRequest.Content = JsonContent.Create(new { tipo = "pedido", id = pedido.Id, tenantId });
                        await mainClient.SendAsync(notifyRequest);
                    }
                    catch { /* fire and forget */ }

                    return Results.Created($"/api/mobile/pedidos/{pedido.Id}", new
                    {
                        success = true,
                        data = new
                        {
                            pedidoId = pedido.Id,
                            cobroId = cobro.Id,
                            numeroPedido,
                            total,
                            metodoPago = request.MetodoPago
                        }
                    });
                }
                catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pg && (pg.SqlState == "23505" || pg.SqlState == "40001"))
                {
                    await transaction.RollbackAsync();
                    db.ChangeTracker.Clear();
                    if (attempt == MaxRetries - 1)
                        return Results.Conflict(new { success = false, message = "No se pudo generar un numero de pedido unico. Intente de nuevo." });
                }
                catch
                {
                    await transaction.RollbackAsync();
                    return Results.StatusCode(500);
                }
            }

            return Results.StatusCode(500);
        })
        .WithSummary("Venta directa (pedido + cobro atomico)")
        .WithDescription("Crea un pedido en estado Entregado con tipo VentaDirecta y un cobro asociado en una sola transaccion. Para uso cuando el vendedor vende, cobra y entrega en el acto.")
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
