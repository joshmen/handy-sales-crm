using System.Globalization;
using System.Text;
using HandySuites.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class CobroVencidoRecordatorioHandler : IAutomationHandler
{
    public string Slug => "cobro-vencido-recordatorio";
    private const string Canal = "push";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
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
            return new AutomationResult(true, M("result.sinSaldosVencidos", lang), null);

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
            return new AutomationResult(true, M("result.sinSaldosVencidos", lang), null);

        // ── Push: notify vendedores ──
        var porVendedor = vencidos.GroupBy(v => v.UsuarioId);
        var notificaciones = 0;

        foreach (var grupo in porVendedor)
        {
            var clientesTexto = string.Join(", ", grupo.Select(v => $"{v.ClienteNombre} (${v.Saldo:N2}, {v.DiasVencido}d)"));
            var mensaje = string.Format(M("cobroVencido.notification", lang), grupo.Count()) + $": {clientesTexto}";

            if (context.Destinatario is "vendedores" or "ambos")
            {
                await context.NotifyUserAsync(grupo.Key, M("cobroVencido.subject", lang), mensaje, "Alert", Canal, ct,
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
                    M("cobroVencido.subject", lang),
                    string.Format(M("cobroVencido.callout", lang),
                        vencidos.Count,
                        vencidos.Count != 1 ? "s" : "",
                        FormatMoney(totalSaldo, culture)),
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
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz, lang));
        content.Append(EmailTemplateBuilder.KpiRow(
            (M("cobroVencido.kpi.totalPendiente", lang), FormatMoney(totalVencido, culture), "💰"),
            (M("cobroVencido.kpi.clientes", lang), vencidos.Count.ToString(), "👥"),
            (M("cobroVencido.kpi.masAntiguo", lang), diasPromedio.ToString(), "📅"),
            (M("cobroVencido.kpi.montoMayor", lang), FormatMoney(vencidos.Max(v => v.Saldo), culture), "⏰")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            string.Format(M("cobroVencido.callout", lang),
                vencidos.Count,
                vencidos.Count != 1 ? "s" : "",
                $"<strong>{FormatMoney(totalVencido, culture)}</strong>"),
            "warning"));

        var rows = vencidos.Select(v => new[]
        {
            System.Net.WebUtility.HtmlEncode(v.ClienteNombre),
            $"<strong style=\"color:#dc2626;\">{FormatMoney(v.Saldo, culture)}</strong>",
            $"{v.DiasVencido} {M("table.dias", lang).ToLower()}",
            System.Net.WebUtility.HtmlEncode(vendedorDict.GetValueOrDefault(v.UsuarioId, "Sin asignar")),
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading(M("cobroVencido.heading", lang)));
        content.Append(EmailTemplateBuilder.Table(
            new[] { M("table.cliente", lang), M("table.monto", lang), M("table.dias", lang), M("table.vendedor", lang) }, rows));

        await context.SendAdminEmailAsync(
            M("cobroVencido.subject", lang),
            content.ToString(),
            ct,
            $"{vencidos.Count} {(lang == "en" ? "overdue payments" : "cobros")} — {FormatMoney(totalVencido, culture)}",
            language: lang);

        return new AutomationResult(true, lang == "en"
            ? $"Reminders sent: {notificaciones} notifications about {vencidos.Count} overdue balances"
            : $"Recordatorios enviados: {notificaciones} notificaciones sobre {vencidos.Count} saldos vencidos");
    }

    private static string FormatMoney(decimal amount, System.Globalization.CultureInfo culture) => amount.ToString("C0", culture);
}
