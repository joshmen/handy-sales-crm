using HandySales.Application.Notifications.DTOs;
using HandySales.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class CobroVencidoRecordatorioHandler : IAutomationHandler
{
    public string Slug => "cobro-vencido-recordatorio";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var db = context.Db;
        var diasVencimiento = context.GetParam("dias_vencimiento", 7);
        var cutoffDate = DateTime.UtcNow.AddDays(-diasVencimiento);

        // Find orders with unpaid balance older than cutoff (limit to 100)
        var pedidosVencidos = await db.Pedidos
            .Include(p => p.Cliente)
            .Where(p => p.TenantId == context.TenantId
                     && p.Activo
                     && p.FechaPedido < cutoffDate
                     && (p.Estado == EstadoPedido.Entregado || p.Estado == EstadoPedido.Confirmado))
            .Select(p => new
            {
                p.Id,
                p.NumeroPedido,
                p.Total,
                p.ClienteId,
                ClienteNombre = p.Cliente.Nombre,
                p.UsuarioId,
                p.FechaPedido,
            })
            .Take(100)
            .ToListAsync(ct);

        if (pedidosVencidos.Count == 0)
            return new AutomationResult(true, "Sin saldos vencidos", null);

        // Get cobros to calculate actual balances
        var pedidoIds = pedidosVencidos.Select(p => p.Id).ToList();
        var cobros = await db.Cobros
            .Where(c => c.TenantId == context.TenantId && c.Activo && c.PedidoId.HasValue && pedidoIds.Contains(c.PedidoId.Value))
            .GroupBy(c => c.PedidoId!.Value)
            .Select(g => new { PedidoId = g.Key, TotalCobrado = g.Sum(c => c.Monto) })
            .ToListAsync(ct);

        var cobrosDict = cobros.ToDictionary(c => c.PedidoId, c => c.TotalCobrado);

        var vencidos = pedidosVencidos
            .Select(p => new
            {
                p.Id,
                p.NumeroPedido,
                p.ClienteNombre,
                p.UsuarioId,
                Saldo = p.Total - cobrosDict.GetValueOrDefault(p.Id, 0m),
                DiasVencido = (int)(DateTime.UtcNow - p.FechaPedido).TotalDays,
            })
            .Where(p => p.Saldo > 0)
            .Take(10)
            .ToList();

        if (vencidos.Count == 0)
            return new AutomationResult(true, "Sin saldos vencidos", null);

        // Group by vendedor and notify each one
        var porVendedor = vencidos.GroupBy(v => v.UsuarioId);
        var notificaciones = 0;

        foreach (var grupo in porVendedor)
        {
            var clientesTexto = string.Join(", ", grupo.Select(v => $"{v.ClienteNombre} (${v.Saldo:N2}, {v.DiasVencido}d)"));
            await context.Notifications.EnviarNotificacionAsync(new SendNotificationDto
            {
                UsuarioId = grupo.Key,
                Titulo = "Cobros vencidos pendientes",
                Mensaje = $"Tienes {grupo.Count()} saldos vencidos: {clientesTexto}",
                Tipo = "Alert",
            });
            notificaciones++;
        }

        return new AutomationResult(true, $"Recordatorios enviados a {notificaciones} vendedores sobre {vencidos.Count} saldos vencidos");
    }
}
