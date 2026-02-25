using System.Security.Claims;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Mobile.Api.Endpoints;

public static class MobileVentaDirectaEndpoints
{
    public static void MapMobileVentaDirectaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/venta-directa")
            .RequireAuthorization()
            .WithTags("Venta Directa")
            .WithOpenApi();

        group.MapPost("/", async (
            VentaDirectaRequest request,
            [FromServices] HandySalesDbContext db,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tenantIdClaim))
                return Results.Unauthorized();

            var usuarioId = int.Parse(userIdClaim);
            var tenantId = int.Parse(tenantIdClaim);

            // Validate client exists and belongs to tenant
            var cliente = await db.Clientes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == request.ClienteId && c.TenantId == tenantId && c.Activo);

            if (cliente == null)
                return Results.BadRequest(new { success = false, message = "Cliente no encontrado" });

            if (request.Items == null || request.Items.Count == 0)
                return Results.BadRequest(new { success = false, message = "Se requiere al menos un producto" });

            // Generate order number (VD prefix for Venta Directa)
            var fecha = DateTime.UtcNow;
            var prefijo = $"VD-{fecha:yyyyMMdd}";
            var ultimoNumero = await db.Pedidos
                .AsNoTracking()
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

            // Calculate totals
            decimal subtotal = 0;
            var detalles = new List<DetallePedido>();

            foreach (var item in request.Items)
            {
                var producto = await db.Productos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == item.ProductoId && p.TenantId == tenantId);

                if (producto == null)
                    return Results.BadRequest(new { success = false, message = $"Producto {item.ProductoId} no encontrado" });

                var precioUnitario = item.PrecioUnitario ?? producto.PrecioBase;
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

            // Create Pedido + Cobro atomically
            await using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
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
            catch
            {
                await transaction.RollbackAsync();
                return Results.StatusCode(500);
            }
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
