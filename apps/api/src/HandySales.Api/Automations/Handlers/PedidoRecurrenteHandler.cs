using System.Text;
using HandySales.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class PedidoRecurrenteHandler : IAutomationHandler
{
    public string Slug => "pedido-recurrente";
    private const string Canal = "push";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var minPedidosHistoricos = context.GetParam("min_pedidos_historicos", 3);

        // Pull order history per client: count, first/last date, avg value
        var clienteOrders = await context.Db.Pedidos
            .Where(p => p.TenantId == context.TenantId && p.Estado != EstadoPedido.Cancelado)
            .GroupBy(p => new { p.ClienteId, p.Cliente.Nombre, p.Cliente.VendedorId })
            .Where(g => g.Count() >= minPedidosHistoricos)
            .Select(g => new
            {
                g.Key.ClienteId,
                g.Key.Nombre,
                g.Key.VendedorId,
                TotalPedidos = g.Count(),
                PrimerPedido = g.Min(p => p.FechaPedido),
                UltimoPedido = g.Max(p => p.FechaPedido),
                MontoPromedio = g.Average(p => p.Total),
            })
            .ToListAsync(ct);

        if (clienteOrders.Count == 0)
            return new AutomationResult(true, "Sin clientes con historial recurrente");

        var now = DateTime.UtcNow;

        // Smart: personal interval per client
        // avg_interval = total_span / (orders - 1)
        // alert when days_since_last > avg_interval * 1.2
        // rank by urgency_ratio * avg_order_value → highest revenue opportunity first
        var clientesSugeridos = clienteOrders
            .Select(c =>
            {
                var spanDays = (c.UltimoPedido - c.PrimerPedido).TotalDays;
                var intervaloPromedio = c.TotalPedidos > 1
                    ? spanDays / (c.TotalPedidos - 1)
                    : 30.0; // only 1 order recorded → 30-day default interval
                var diasDesde = (now - c.UltimoPedido).TotalDays;
                var urgencia = intervaloPromedio > 0 ? diasDesde / intervaloPromedio : 0;
                return new
                {
                    c.ClienteId,
                    Nombre = c.Nombre ?? "Sin nombre",
                    c.VendedorId,
                    c.TotalPedidos,
                    c.UltimoPedido,
                    c.MontoPromedio,
                    IntervaloPromedio = intervaloPromedio,
                    DiasDesde = (int)diasDesde,
                    Urgencia = urgencia,
                };
            })
            .Where(c => c.Urgencia >= 1.2) // 20%+ overdue on personal cycle
            .OrderByDescending(c => c.Urgencia * (double)c.MontoPromedio) // revenue × urgency
            .Take(20)
            .ToList();

        if (clientesSugeridos.Count == 0)
            return new AutomationResult(true, "Todos los clientes están dentro de su ciclo normal de pedido");

        // ── Push: one aggregated notification per vendedor ──
        var notified = 0;
        var porVendedor = clientesSugeridos.GroupBy(c => c.VendedorId ?? 0);

        foreach (var grupo in porVendedor)
        {
            var recipients = grupo.Key == 0
                ? new List<int>()
                : await context.ResolvePerClientRecipientsAsync(grupo.Key, ct);

            var nombres = string.Join(", ", grupo.Take(3).Select(c => c.Nombre));
            var mas = grupo.Count() > 3 ? $" y {grupo.Count() - 3} más" : "";
            var mensaje = grupo.Count() == 1
                ? $"{grupo.First().Nombre} lleva {grupo.First().DiasDesde} días sin pedir (ciclo usual: {(int)grupo.First().IntervaloPromedio}d)."
                : $"{grupo.Count()} clientes listos para reordenar: {nombres}{mas}";

            foreach (var userId in recipients)
            {
                await context.NotifyUserAsync(userId,
                    $"{grupo.Count()} oportunidad{(grupo.Count() != 1 ? "es" : "")} de reorden",
                    mensaje, "General", Canal, ct,
                    new Dictionary<string, string> { { "url", "/orders" } });
                notified++;
            }
        }

        // Single push to admin (email has full detail)
        if (context.Destinatario is "admin" or "ambos")
        {
            var adminId = await context.GetAdminUserIdAsync(ct);
            if (adminId.HasValue)
            {
                await context.NotifyUserAsync(adminId.Value,
                    $"{clientesSugeridos.Count} oportunidades de reorden",
                    "Te hemos enviado un correo con los detalles.",
                    "General", Canal, ct);
                notified++;
            }
        }

        // ── Rich email report to admin ──
        var vendedorIds = clientesSugeridos
            .Where(c => c.VendedorId.HasValue).Select(c => c.VendedorId!.Value).Distinct().ToList();
        var vendedores = await context.Db.Usuarios
            .Where(u => vendedorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Nombre })
            .ToListAsync(ct);
        var vendedorDict = vendedores.ToDictionary(v => v.Id, v => v.Nombre ?? "Sin asignar");

        var topUrgencia = (int)(clientesSugeridos.First().Urgencia * 100);

        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz));
        content.Append(EmailTemplateBuilder.KpiRow(
            ("Oportunidades", clientesSugeridos.Count.ToString(), "🔄"),
            ("Mayor retraso", $"{topUrgencia}%", "🔥"),
            ("Pedidos mín.", minPedidosHistoricos.ToString(), "📊")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            $"<strong>{clientesSugeridos.Count}</strong> cliente{(clientesSugeridos.Count != 1 ? "s" : "")} " +
            "han superado su ciclo personal de compra. El ranking combina qué tan retrasados están " +
            "con el valor promedio de sus pedidos.",
            "info"));

        var rows = clientesSugeridos.Select(c =>
        {
            var vendedor = c.VendedorId.HasValue
                ? System.Net.WebUtility.HtmlEncode(vendedorDict.GetValueOrDefault(c.VendedorId.Value, "Sin asignar"))
                : "<span style=\"color:#9ca3af;\">Sin asignar</span>";
            var pct = (int)(c.Urgencia * 100);
            var pctColor = pct >= 200 ? "#dc2626" : pct >= 150 ? "#d97706" : "#2563eb";
            return new[]
            {
                System.Net.WebUtility.HtmlEncode(c.Nombre),
                $"cada {(int)c.IntervaloPromedio}d",
                $"{c.DiasDesde} días",
                $"<span style=\"color:{pctColor};font-weight:700;\">{pct}%</span>",
                vendedor,
            };
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading("Clientes con oportunidad de reorden (urgencia × valor)"));
        content.Append(EmailTemplateBuilder.Table(
            new[] { "Cliente", "Ciclo usual", "Sin pedir", "Retraso", "Vendedor" }, rows));

        await context.SendAdminEmailAsync(
            "Oportunidades de Reorden Inteligente",
            content.ToString(),
            ct,
            $"{clientesSugeridos.Count} clientes fuera de su ciclo normal de compra");

        return new AutomationResult(true,
            $"Reorden: {clientesSugeridos.Count} clientes con ciclo superado ({notified} notificaciones)");
    }
}
