using System.Text;
using HandySuites.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class PedidoRecurrenteHandler : IAutomationHandler
{
    public string Slug => "pedido-recurrente";
    private const string Canal = "push";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
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
            return new AutomationResult(true, M("result.sinClientesRecurrentes", lang));

        var now = DateTime.UtcNow;

        // Smart: personal interval per client
        var clientesSugeridos = clienteOrders
            .Select(c =>
            {
                var spanDays = (c.UltimoPedido - c.PrimerPedido).TotalDays;
                var intervaloPromedio = c.TotalPedidos > 1
                    ? spanDays / (c.TotalPedidos - 1)
                    : 30.0;
                var diasDesde = (now - c.UltimoPedido).TotalDays;
                var urgencia = intervaloPromedio > 0 ? diasDesde / intervaloPromedio : 0;
                return new
                {
                    c.ClienteId,
                    Nombre = c.Nombre ?? M("misc.sinNombre", lang),
                    c.VendedorId,
                    c.TotalPedidos,
                    c.UltimoPedido,
                    c.MontoPromedio,
                    IntervaloPromedio = intervaloPromedio,
                    DiasDesde = (int)diasDesde,
                    Urgencia = urgencia,
                };
            })
            .Where(c => c.Urgencia >= 1.2)
            .OrderByDescending(c => c.Urgencia * (double)c.MontoPromedio)
            .Take(20)
            .ToList();

        if (clientesSugeridos.Count == 0)
            return new AutomationResult(true, M("result.todosClientesCicloNormal", lang));

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
                ? $"{grupo.First().Nombre} — {grupo.First().DiasDesde}d ({M("table.ciclo", lang)}: {(int)grupo.First().IntervaloPromedio}d)"
                : $"{grupo.Count()} {M("pedidoRecurrente.kpi.oportunidades", lang).ToLower()}: {nombres}{mas}";

            foreach (var userId in recipients)
            {
                await context.NotifyUserAsync(userId,
                    M("pedidoRecurrente.subject", lang),
                    mensaje, "General", Canal, ct,
                    new Dictionary<string, string> { { "url", "/orders" } });
                notified++;
            }
        }

        // Single push to admin
        if (context.Destinatario is "admin" or "ambos")
        {
            var adminId = await context.GetAdminUserIdAsync(ct);
            if (adminId.HasValue)
            {
                await context.NotifyUserAsync(adminId.Value,
                    M("pedidoRecurrente.subject", lang),
                    $"{clientesSugeridos.Count} {M("pedidoRecurrente.kpi.oportunidades", lang).ToLower()}",
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
        var vendedorDict = vendedores.ToDictionary(v => v.Id, v => v.Nombre ?? M("misc.sinAsignar", lang));

        var urgentes = clientesSugeridos.Count(c => c.Urgencia >= 2.0);

        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz, lang));
        content.Append(EmailTemplateBuilder.KpiRow(
            (M("pedidoRecurrente.kpi.oportunidades", lang), clientesSugeridos.Count.ToString(), "🔄"),
            (M("pedidoRecurrente.kpi.urgentes", lang), urgentes.ToString(), "🔥"),
            (M("pedidoRecurrente.kpi.valorEstimado", lang), $"~{clientesSugeridos.Sum(c => c.MontoPromedio):N0}", "💰")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            $"<strong>{clientesSugeridos.Count}</strong> cliente{(clientesSugeridos.Count != 1 ? "s" : "")} " +
            M("pedidoRecurrente.heading", lang).ToLower() + ".",
            "info"));

        var rows = clientesSugeridos.Select(c =>
        {
            var vendedor = c.VendedorId.HasValue
                ? System.Net.WebUtility.HtmlEncode(vendedorDict.GetValueOrDefault(c.VendedorId.Value, M("misc.sinAsignar", lang)))
                : "<span style=\"color:#9ca3af;\">Sin asignar</span>";
            var pct = (int)(c.Urgencia * 100);
            var pctColor = pct >= 200 ? "#dc2626" : pct >= 150 ? "#d97706" : "#2563eb";
            return new[]
            {
                System.Net.WebUtility.HtmlEncode(c.Nombre),
                $"{(int)c.IntervaloPromedio}d",
                $"{c.DiasDesde} {M("table.dias", lang).ToLower()}",
                $"<span style=\"color:{pctColor};font-weight:700;\">{pct}%</span>",
                vendedor,
            };
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading(M("pedidoRecurrente.heading", lang)));
        content.Append(EmailTemplateBuilder.Table(
            new[] { M("table.cliente", lang), M("table.ciclo", lang), M("table.diasSinPedido", lang), M("table.urgencia", lang), M("table.vendedor", lang) }, rows));

        await context.SendAdminEmailAsync(
            M("pedidoRecurrente.subject", lang),
            content.ToString(),
            ct,
            $"{clientesSugeridos.Count} {M("pedidoRecurrente.kpi.oportunidades", lang).ToLower()}",
            language: lang);

        return new AutomationResult(true, lang == "en"
            ? $"Reorder: {clientesSugeridos.Count} clients with overdue cycle ({notified} notifications)"
            : $"Reorden: {clientesSugeridos.Count} clientes con ciclo superado ({notified} notificaciones)");
    }
}
