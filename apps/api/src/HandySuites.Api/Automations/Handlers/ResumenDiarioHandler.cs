using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class ResumenDiarioHandler : IAutomationHandler
{
    public string Slug => "resumen-diario";
    private const string Canal = "email";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var db = context.Db;

        var tz = TimeZoneInfo.FindSystemTimeZoneById(tenantTz ?? "America/Mexico_City");
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        var today = now.Date;

        // Ventas del día (non-cancelled)
        var pedidos = await db.Pedidos
            .Where(p => p.TenantId == context.TenantId && p.Activo && p.FechaPedido.Date == today && p.Estado != Domain.Entities.EstadoPedido.Cancelado)
            .ToListAsync(ct);
        var ventasTotal = pedidos.Sum(p => p.Total);
        var ventasCount = pedidos.Count;

        // Cobros del día
        var cobros = await db.Cobros
            .Where(c => c.TenantId == context.TenantId && c.Activo && c.FechaCobro.Date == today)
            .ToListAsync(ct);
        var cobrosTotal = cobros.Sum(c => c.Monto);
        var cobrosCount = cobros.Count;

        // Visitas del día
        var visitasHoy = await db.ClienteVisitas
            .CountAsync(v => v.TenantId == context.TenantId && v.Activo && v.FechaHoraInicio != null && v.FechaHoraInicio.Value.Date == today, ct);

        // Clientes nuevos
        var clientesNuevos = await db.Clientes
            .CountAsync(c => c.TenantId == context.TenantId && c.Activo && c.CreadoEn.Date == today, ct);

        // Top vendedores
        var topVendedores = await db.Pedidos
            .Where(p => p.TenantId == context.TenantId && p.Activo && p.FechaPedido.Date == today && p.Estado != Domain.Entities.EstadoPedido.Cancelado)
            .GroupBy(p => new { p.UsuarioId, p.Usuario.Nombre })
            .Select(g => new { Nombre = g.Key.Nombre ?? "—", Pedidos = g.Count(), Total = g.Sum(p => p.Total) })
            .OrderByDescending(x => x.Total)
            .Take(5)
            .ToListAsync(ct);

        // Top clientes
        var topClientes = await db.Pedidos
            .Where(p => p.TenantId == context.TenantId && p.Activo && p.FechaPedido.Date == today)
            .GroupBy(p => new { p.ClienteId, p.Cliente.Nombre })
            .Select(g => new { Nombre = g.Key.Nombre ?? "—", Pedidos = g.Count(), Total = g.Sum(p => p.Total) })
            .OrderByDescending(x => x.Total)
            .Take(5)
            .ToListAsync(ct);

        // ── Build rich email content ──
        var content = new StringBuilder();

        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz, lang));

        // KPI cards
        content.Append(EmailTemplateBuilder.KpiRow(
            (M("resumenDiario.kpi.ventas", lang), FormatMoney(ventasTotal, culture), "\ud83d\udcb0"),
            (M("resumenDiario.kpi.cobros", lang), FormatMoney(cobrosTotal, culture), "\ud83d\udcb3"),
            (M("resumenDiario.kpi.pedidos", lang), ventasCount.ToString(), "\ud83d\udce6"),
            (M("resumenDiario.kpi.visitas", lang), visitasHoy.ToString(), "\ud83d\udccd")
        ));

        // Summary callout
        if (ventasCount == 0 && cobrosCount == 0 && visitasHoy == 0)
        {
            content.Append(EmailTemplateBuilder.Callout(M("resumenDiario.noActivity", lang), "warning"));
        }
        else if (ventasTotal > 0)
        {
            var summaryText = string.Format(M("resumenDiario.summary", lang),
                $"<strong>{FormatMoney(ventasTotal, culture)}</strong>",
                ventasCount,
                ventasCount != 1 ? "s" : "");
            content.Append(EmailTemplateBuilder.Callout(summaryText, "success"));
        }

        // Top vendedores
        if (topVendedores.Count > 0)
        {
            content.Append(EmailTemplateBuilder.SectionHeading(M("resumenDiario.topVendors", lang)));
            var vendRows = topVendedores.Select((v, i) => new[]
            {
                $"<strong>{i + 1}.</strong> {System.Net.WebUtility.HtmlEncode(v.Nombre)}",
                v.Pedidos.ToString(),
                $"<strong>{FormatMoney(v.Total, culture)}</strong>"
            }).ToList();
            content.Append(EmailTemplateBuilder.Table(
                new[] { M("table.vendedor", lang), M("table.pedidos", lang), M("table.monto", lang) }, vendRows));
        }

        // Top clientes
        if (topClientes.Count > 0)
        {
            content.Append(EmailTemplateBuilder.SectionHeading(M("resumenDiario.topClients", lang)));
            var clientRows = topClientes.Select((c, i) => new[]
            {
                $"<strong>{i + 1}.</strong> {System.Net.WebUtility.HtmlEncode(c.Nombre)}",
                c.Pedidos.ToString(),
                $"<strong>{FormatMoney(c.Total, culture)}</strong>"
            }).ToList();
            content.Append(EmailTemplateBuilder.Table(
                new[] { M("table.cliente", lang), M("table.pedidos", lang), M("table.monto", lang) }, clientRows));
        }

        // Push notification
        var userIds = await context.ResolveDestinatarioIdsAsync(ct);
        foreach (var userId in userIds)
        {
            await context.NotifyUserAsync(userId, M("resumenDiario.subject", lang),
                M("resumenDiario.notification", lang),
                "General", "push", ct);
        }

        // Rich email
        await context.SendRichEmailAsync(
            M("resumenDiario.subject", lang),
            content.ToString(),
            ct,
            $"{M("resumenDiario.kpi.ventas", lang)}: {FormatMoney(ventasTotal, culture)} | {M("resumenDiario.kpi.cobros", lang)}: {FormatMoney(cobrosTotal, culture)} | {visitasHoy} {M("resumenDiario.kpi.visitas", lang).ToLower()}",
            language: lang);

        return new AutomationResult(true,
            string.Format(M("resumenDiario.result", lang), ventasCount, cobrosCount, visitasHoy));
    }

    private static string FormatMoney(decimal amount, CultureInfo culture)
        => amount.ToString("C0", culture);
}
