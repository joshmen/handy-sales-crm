using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Notifications.Services;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Services;

/// <summary>
/// Sends push notifications to relevant users after order state transitions.
/// Fire-and-forget pattern: never blocks the API response.
/// </summary>
public class OrderNotificationHelper
{
    private readonly HandySuitesDbContext _db;
    private readonly PushNotificationService _push;
    private readonly NotificationSettingsService _settings;
    private readonly ILogger<OrderNotificationHelper> _logger;

    public OrderNotificationHelper(
        HandySuitesDbContext db,
        PushNotificationService push,
        NotificationSettingsService settings,
        ILogger<OrderNotificationHelper> logger)
    {
        _db = db;
        _push = push;
        _settings = settings;
        _logger = logger;
    }

    /// <summary>
    /// Notify relevant users about an order state change.
    /// currentUserId is excluded from recipients (they already see the result).
    /// </summary>
    public async Task NotifyStateChangeAsync(
        int pedidoId,
        int tenantId,
        int currentUserId,
        EstadoPedido newState)
    {
        try
        {
            // Check if notification type is enabled for this tenant
            var notifType = newState switch
            {
                EstadoPedido.Confirmado => "order.confirmed",
                EstadoPedido.EnRuta => "order.en_route",
                EstadoPedido.Entregado => "order.delivered",
                EstadoPedido.Cancelado => "order.cancelled",
                _ => "order.confirmed",
            };
            if (!await _settings.IsEnabledAsync(tenantId, notifType)) return;

            // Load pedido info
            var pedido = await _db.Pedidos
                .IgnoreQueryFilters()
                .Where(p => p.Id == pedidoId && p.TenantId == tenantId)
                .Select(p => new { p.UsuarioId, p.NumeroPedido, p.ClienteId })
                .FirstOrDefaultAsync();

            if (pedido is null) return;

            // Resolve client name for the notification body
            var clienteNombre = await _db.Clientes
                .IgnoreQueryFilters()
                .Where(c => c.Id == pedido.ClienteId && c.TenantId == tenantId)
                .Select(c => c.Nombre)
                .FirstOrDefaultAsync() ?? "Cliente";

            // Determine recipients and build notification
            var (recipientIds, title, body, type) = ResolveNotification(
                newState, pedido.UsuarioId, pedido.NumeroPedido, clienteNombre, tenantId, currentUserId);

            if (recipientIds.Count == 0) return;

            // Remove the acting user — they don't need a push about their own action
            recipientIds.Remove(currentUserId);
            if (recipientIds.Count == 0) return;

            var data = new Dictionary<string, string>
            {
                ["type"] = type,
                ["entityId"] = pedidoId.ToString()
            };

            await _push.SendToUsersAsync(recipientIds, tenantId, title, body, data);
            _logger.LogInformation("Push sent for order {PedidoId} ({Type}) to {Count} user(s)", pedidoId, type, recipientIds.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send order notification for pedido {PedidoId}", pedidoId);
        }
    }

    private (List<int> recipientIds, string title, string body, string type) ResolveNotification(
        EstadoPedido newState,
        int vendedorId,
        string numeroPedido,
        string clienteNombre,
        int tenantId,
        int currentUserId)
    {
        var numero = !string.IsNullOrEmpty(numeroPedido) ? $"#{numeroPedido}" : $"#{vendedorId}";

        return newState switch
        {
            // Simplified flow: Borrador → Confirmado → EnRuta → Entregado + Cancelado
            EstadoPedido.Confirmado => (
                GetVendedorAndSupervisors(vendedorId, tenantId).Result,
                $"Pedido {numero} confirmado",
                $"Pedido para {clienteNombre} fue confirmado",
                "order.confirmed"
            ),
            EstadoPedido.EnRuta => (
                new List<int> { vendedorId },
                $"Pedido {numero} en ruta",
                $"Tu pedido para {clienteNombre} va en camino",
                "order.en_route"
            ),
            EstadoPedido.Entregado => (
                GetVendedorAndSupervisors(vendedorId, tenantId).Result,
                $"Pedido {numero} entregado",
                $"Pedido para {clienteNombre} entregado exitosamente",
                "order.delivered"
            ),
            EstadoPedido.Cancelado => (
                GetVendedorAndSupervisors(vendedorId, tenantId).Result,
                $"Pedido {numero} cancelado",
                $"El pedido para {clienteNombre} fue cancelado",
                "order.cancelled"
            ),
#pragma warning disable CS0618 // Legacy states — kept for safety if old data triggers notification
            EstadoPedido.Enviado => (
                GetVendedorAndSupervisors(vendedorId, tenantId).Result,
                $"Pedido {numero} confirmado",
                $"Pedido para {clienteNombre} fue confirmado",
                "order.confirmed"
            ),
            EstadoPedido.EnProceso => (
                new List<int> { vendedorId },
                $"Pedido {numero} en ruta",
                $"Tu pedido para {clienteNombre} va en camino",
                "order.en_route"
            ),
#pragma warning restore CS0618
            _ => (new List<int>(), "", "", "")
        };
    }

    /// <summary>
    /// Get supervisor(s) + admin(s) for the tenant.
    /// Used when vendedor sends a new order → notify supervisors.
    /// </summary>
    private async Task<List<int>> GetSupervisorsAndAdmins(int tenantId)
    {
        return await _db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId &&
                        u.Activo &&
                        u.EliminadoEn == null &&
                        (u.RolExplicito == "SUPERVISOR" || u.RolExplicito == "ADMIN" || u.EsAdmin))
            .Select(u => u.Id)
            .ToListAsync();
    }

    /// <summary>
    /// Get vendedor + their supervisor(s) + admin(s).
    /// Used for delivered/cancelled notifications.
    /// </summary>
    private async Task<List<int>> GetVendedorAndSupervisors(int vendedorId, int tenantId)
    {
        var ids = new HashSet<int> { vendedorId };

        // Get the vendedor's direct supervisor
        var supervisorId = await _db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.Id == vendedorId && u.TenantId == tenantId)
            .Select(u => u.SupervisorId)
            .FirstOrDefaultAsync();

        if (supervisorId.HasValue && supervisorId.Value > 0)
            ids.Add(supervisorId.Value);

        // Also add admins
        var adminIds = await _db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId &&
                        u.Activo &&
                        u.EliminadoEn == null &&
                        (u.RolExplicito == "ADMIN" || u.EsAdmin))
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var id in adminIds)
            ids.Add(id);

        return ids.ToList();
    }
}
