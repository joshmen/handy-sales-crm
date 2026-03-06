using System.Globalization;
using System.Text;
using HandySales.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class CobroVencidoRecordatorioHandler : IAutomationHandler
{
    public string Slug => "cobro-vencido-recordatorio";
    private const string Canal = "push";
    // Culture is now resolved dynamically via context.GetTenantCultureAsync(ct)

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var db = context.Db;
        var diasVencimiento = context.GetParam("dias_vencimiento", 7);
        var cutoffDate = DateTime.UtcNow.AddDays(-diasVencimiento);

        var pedidosVencidos = await db.Pedidos
            .Include(p => p.Cliente)
            .Where(p => p.TenantId == context.TenantId
                     && p.Activo
                     && p.FechaPedido < cutoffDate
                     && (p.Estado == EstadoPedido.Entregado || p.Estado == EstadoPedido.Confirmado))
            .Select(p => new
            {
                p.Id,
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

        // Calculate balances
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
                p.ClienteNombre,
                p.UsuarioId,
                Saldo = p.Total - cobrosDict.GetValueOrDefault(p.Id, 0m),
                DiasVencido = (int)(DateTime.UtcNow - p.FechaPedido).TotalDays,
            })
            .Where(p => p.Saldo > 0)
            .OrderByDescending(p => p.Saldo)
            .Take(10)
            .ToList();

        if (vencidos.Count == 0)
            return new AutomationResult(true, "Sin saldos vencidos", null);

        // ── Push: notify vendedores ──
        var porVendedor = vencidos.GroupBy(v => v.UsuarioId);
        var notificaciones = 0;

        foreach (var grupo in porVendedor)
        {
            var clientesTexto = string.Join(", ", grupo.Select(v => $"{v.ClienteNombre} (${v.Saldo:N2}, {v.DiasVencido}d)"));
            var mensaje = $"Tienes {grupo.Count()} saldos vencidos: {clientesTexto}";

            if (context.Destinatario is "vendedores" or "ambos")
            {
                await context.NotifyUserAsync(grupo.Key, "Cobros vencidos pendientes", mensaje, "Alert", Canal, ct,
                    new Dictionary<string, string> { { "url", "/cobranza?filtro=vencido" } });
                notificaciones++;
            }
        }

        // Push to admin (plain text)
        if (context.Destinatario is "admin" or "ambos")
        {
            var totalSaldo = vencidos.Sum(v => v.Saldo);
            var adminId = await context.GetAdminUserIdAsync(ct);
            if (adminId.HasValue)
            {
                await context.NotifyUserAsync(adminId.Value,
                    "Cobros vencidos pendientes",
                    $"{vencidos.Count} saldos vencidos por {FormatMoney(totalSaldo, culture)}. Ver detalle →",
                    "Alert", Canal, ct, new Dictionary<string, string> { { "url", "/cobranza?filtro=vencido" } });
                notificaciones++;
            }
        }

        // ── Rich email report to admin ──
        var vendedorIds = vencidos.Select(v => v.UsuarioId).Distinct().ToList();
        var vendedores = await db.Usuarios
            .Where(u => vendedorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Nombre })
            .ToListAsync(ct);
        var vendedorDict = vendedores.ToDictionary(v => v.Id, v => v.Nombre ?? "Sin asignar");

        var totalVencido = vencidos.Sum(v => v.Saldo);
        var diasPromedio = (int)vencidos.Average(v => v.DiasVencido);

        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz));
        content.Append(EmailTemplateBuilder.KpiRow(
            ("Total vencido", FormatMoney(totalVencido, culture), "💰"),
            ("Clientes", vencidos.Count.ToString(), "👥"),
            ("Días promedio", diasPromedio.ToString(), "📅"),
            ("Días de corte", diasVencimiento.ToString(), "⏰")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            $"Hay <strong>{vencidos.Count}</strong> cobro{(vencidos.Count != 1 ? "s" : "")} vencidos por un total de <strong>{FormatMoney(totalVencido, culture)}</strong>. " +
            $"Los saldos llevan más de {diasVencimiento} días sin cobrar.",
            "warning"));

        var rows = vencidos.Select(v => new[]
        {
            System.Net.WebUtility.HtmlEncode(v.ClienteNombre),
            $"<strong style=\"color:#dc2626;\">{FormatMoney(v.Saldo, culture)}</strong>",
            $"{v.DiasVencido} días",
            System.Net.WebUtility.HtmlEncode(vendedorDict.GetValueOrDefault(v.UsuarioId, "Sin asignar")),
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading("Cobros vencidos (ordenados por monto)"));
        content.Append(EmailTemplateBuilder.Table(
            new[] { "Cliente", "Saldo Vencido", "Días Vencido", "Vendedor" }, rows));

        await context.SendAdminEmailAsync(
            "Reporte de Cobros Vencidos",
            content.ToString(),
            ct,
            $"{vencidos.Count} cobros pendientes — {FormatMoney(totalVencido, culture)}");

        return new AutomationResult(true, $"Recordatorios enviados: {notificaciones} notificaciones sobre {vencidos.Count} saldos vencidos");
    }

    private static string FormatMoney(decimal amount, System.Globalization.CultureInfo culture) => amount.ToString("C0", culture);
}
