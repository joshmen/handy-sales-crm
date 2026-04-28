using HandySuites.Domain.Common;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Services;

/// <summary>
/// Checks stock levels after order delivery and sends push notifications
/// to admins/supervisors when stock falls below the minimum threshold.
/// </summary>
public class StockNotificationService
{
    private readonly HandySuitesDbContext _db;
    private readonly PushNotificationService _push;
    private readonly ILogger<StockNotificationService> _logger;

    public StockNotificationService(
        HandySuitesDbContext db,
        PushNotificationService push,
        ILogger<StockNotificationService> logger)
    {
        _db = db;
        _push = push;
        _logger = logger;
    }

    /// <summary>
    /// After an order is delivered, check stock levels for each product in the order.
    /// If CantidadActual &lt;= StockMinimo, send push to admins/supervisors.
    /// </summary>
    public async Task CheckAndNotifyLowStockAsync(int pedidoId, int tenantId)
    {
        try
        {
            // Get all product IDs from the delivered order
            var productoIds = await _db.DetallePedidos
                .IgnoreQueryFilters()
                .Where(d => d.PedidoId == pedidoId && d.EliminadoEn == null)
                .Select(d => d.ProductoId)
                .Distinct()
                .ToListAsync();

            if (productoIds.Count == 0) return;

            // Check inventory levels for those products
            var lowStockItems = await _db.Inventarios
                .IgnoreQueryFilters()
                .Where(i => i.TenantId == tenantId &&
                            productoIds.Contains(i.ProductoId) &&
                            i.EliminadoEn == null &&
                            i.CantidadActual <= i.StockMinimo &&
                            i.StockMinimo > 0)
                .Select(i => new
                {
                    i.ProductoId,
                    ProductoNombre = i.Producto.Nombre,
                    StockDisponible = i.CantidadActual,
                    i.StockMinimo
                })
                .ToListAsync();

            if (lowStockItems.Count == 0) return;

            // Get admin/supervisor user IDs to notify
            var recipientIds = await _db.Usuarios
                .IgnoreQueryFilters()
                .Where(u => u.TenantId == tenantId &&
                            u.Activo &&
                            u.EliminadoEn == null &&
                            (u.RolExplicito == RoleNames.Supervisor || u.RolExplicito == RoleNames.Admin || u.RolExplicito == RoleNames.SuperAdmin))
                .Select(u => u.Id)
                .ToListAsync();

            if (recipientIds.Count == 0) return;

            // Send a push notification for each low-stock product
            foreach (var item in lowStockItems)
            {
                var data = new Dictionary<string, string>
                {
                    ["type"] = "stock.low",
                    ["entityId"] = item.ProductoId.ToString()
                };

                await _push.SendToUsersAsync(
                    recipientIds,
                    tenantId,
                    $"Stock bajo: {item.ProductoNombre}",
                    $"{item.StockDisponible} unidades restantes (m\u00ednimo: {item.StockMinimo})",
                    data);
            }

            _logger.LogInformation(
                "Low stock check for order {PedidoId}: {Count} product(s) below minimum in tenant {TenantId}",
                pedidoId, lowStockItems.Count, tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check/notify low stock for order {PedidoId}", pedidoId);
        }
    }
}
