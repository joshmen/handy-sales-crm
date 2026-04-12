using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class StockBajoAlertaHandler : IAutomationHandler
{
    public string Slug => "stock-bajo-alerta";
    private const string Canal = "push";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var umbralPorcentaje = context.GetParam("umbral_porcentaje", 20);

        var productosBajos = await context.Db.Inventarios
            .Include(i => i.Producto)
            .Where(i => i.TenantId == context.TenantId
                     && i.Producto.Activo
                     && i.StockMinimo > 0
                     && i.CantidadActual <= i.StockMinimo * umbralPorcentaje / 100m)
            .Select(i => new
            {
                i.Producto.Nombre,
                Cantidad = i.CantidadActual,
                i.StockMinimo,
                SinStock = i.CantidadActual <= 0,
            })
            .OrderBy(i => i.Cantidad)
            .Take(20)
            .ToListAsync(ct);

        if (productosBajos.Count == 0)
            return new AutomationResult(true, string.Format(M("stockBajo.result", lang), 0));

        // ── Push notification (brief) ──
        var productList = string.Join(", ", productosBajos.Take(5).Select(p => $"{p.Nombre} ({p.Cantidad}/{p.StockMinimo})"));
        var message = productosBajos.Count == 1
            ? $"{productosBajos[0].Nombre} — {productosBajos[0].Cantidad}/{productosBajos[0].StockMinimo}"
            : $"{productosBajos.Count} {M("stockBajo.notification", lang)}: {productList}";

        await context.NotifyAsync(M("stockBajo.subject", lang), message, "Alert", Canal, ct, "/inventory?alerta=stock_bajo");

        // ── Rich email report to admin ──
        var sinStock = productosBajos.Count(p => p.SinStock);
        var stockBajo = productosBajos.Count(p => !p.SinStock);

        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz, lang));
        content.Append(EmailTemplateBuilder.KpiRow(
            (M("stockBajo.kpi.afectados", lang), productosBajos.Count.ToString(), "⚠️"),
            (M("stockBajo.kpi.sinStock", lang), sinStock.ToString(), "🚫"),
            (M("stockBajo.kpi.stockBajo", lang), stockBajo.ToString(), "📦")
        ));

        var calloutTipo = sinStock > 0 ? "error" : "warning";
        content.Append(EmailTemplateBuilder.Callout(
            $"Se detectaron <strong>{productosBajos.Count}</strong> producto{(productosBajos.Count != 1 ? "s" : "")} por debajo del {umbralPorcentaje}% de su stock mínimo. " +
            (sinStock > 0 ? $"<strong>{sinStock}</strong> están completamente agotados. " : "") +
            "Considera reabastecer para evitar desabasto.",
            calloutTipo));

        var rows = productosBajos.Select(p => new[]
        {
            System.Net.WebUtility.HtmlEncode(p.Nombre),
            p.Cantidad <= 0
                ? "<span style=\"color:#dc2626;font-weight:700;\">0</span>"
                : p.Cantidad.ToString("N0"),
            p.StockMinimo.ToString("N0"),
            p.SinStock
                ? $"<span style=\"background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;\">{M("stockBajo.kpi.sinStock", lang).ToUpper()}</span>"
                : $"<span style=\"background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;\">{M("stockBajo.kpi.stockBajo", lang).ToUpper()}</span>",
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading(M("stockBajo.heading", lang)));
        content.Append(EmailTemplateBuilder.Table(
            new[] { M("table.producto", lang), "Stock", M("table.minimo", lang), "Estado" }, rows));

        await context.SendAdminEmailAsync(
            M("stockBajo.subject", lang),
            content.ToString(),
            ct,
            $"{productosBajos.Count} {M("stockBajo.notification", lang)}",
            language: lang);

        return new AutomationResult(true, string.Format(M("stockBajo.result", lang), productosBajos.Count));
    }
}
