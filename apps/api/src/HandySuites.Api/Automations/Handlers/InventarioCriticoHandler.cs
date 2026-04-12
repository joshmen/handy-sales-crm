using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class InventarioCriticoHandler : IAutomationHandler
{
    public string Slug => "inventario-critico";
    private const string Canal = "push";

    private static string M(string key, string lang) => AutomationMessages.Get(key, lang);

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
        var culture = await context.GetTenantCultureAsync(ct);
        var lang = culture.TwoLetterISOLanguageName; // "es" or "en"
        var tenantTz = await context.GetTenantTimezoneAsync(ct);
        var productosEnCero = await context.Db.Inventarios
            .Include(i => i.Producto)
            .Where(i => i.TenantId == context.TenantId
                     && i.Producto.Activo
                     && i.CantidadActual <= 0)
            .Select(i => new
            {
                i.Producto.Nombre,
                Cantidad = i.CantidadActual,
                i.StockMinimo,
            })
            .OrderByDescending(i => i.StockMinimo) // highest minimum first (most critical)
            .Take(20)
            .ToListAsync(ct);

        if (productosEnCero.Count == 0)
            return new AutomationResult(true, string.Format(M("inventarioCritico.result", lang), 0));

        // ── Push notification (brief) ──
        var productList = string.Join(", ", productosEnCero.Take(5).Select(p => p.Nombre));
        var message = productosEnCero.Count == 1
            ? $"{productosEnCero[0].Nombre} — 0"
            : $"{productosEnCero.Count} {M("inventarioCritico.kpi.afectados", lang).ToLower()}: {productList}";

        await context.NotifyAsync(M("inventarioCritico.subject", lang), message, "Alert", Canal, ct, "/inventory?alerta=critico");

        // ── Explicit push to admin (ensure admin always gets notified even if destinatario=vendedores) ──
        var adminId = await context.GetAdminUserIdAsync(ct);
        if (adminId.HasValue)
        {
            // Check if admin wasn't already notified via NotifyAsync (destinatario might be "vendedores" only)
            if (context.Destinatario is not ("admin" or "ambos"))
            {
                await context.NotifyUserAsync(adminId.Value,
                    M("inventarioCritico.subject", lang),
                    message,
                    "Alert", Canal, ct,
                    new Dictionary<string, string> { { "url", "/inventory?alerta=critico" } });
            }
        }

        // ── Rich email report to admin ──
        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz, lang));
        content.Append(EmailTemplateBuilder.KpiRow(
            (M("inventarioCritico.kpi.sinStock", lang), productosEnCero.Count.ToString(), "🚫"),
            (M("inventarioCritico.kpi.afectados", lang), productosEnCero.Count.ToString(), "🔴")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            $"<strong>{productosEnCero.Count} producto{(productosEnCero.Count != 1 ? "s" : "")}</strong> — " +
            M("inventarioCritico.callout", lang),
            "error"));

        var rows = productosEnCero.Select(p => new[]
        {
            System.Net.WebUtility.HtmlEncode(p.Nombre),
            "<span style=\"color:#dc2626;font-weight:700;\">0</span>",
            p.StockMinimo > 0
                ? p.StockMinimo.ToString("N0")
                : "<span style=\"color:#9ca3af;\">—</span>",
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading(M("inventarioCritico.heading", lang)));
        content.Append(EmailTemplateBuilder.Table(
            new[] { M("table.producto", lang), M("table.stock", lang), M("table.minimo", lang) }, rows));

        await context.SendAdminEmailAsync(
            M("inventarioCritico.subject", lang),
            content.ToString(),
            ct,
            $"URGENTE: {productosEnCero.Count} {M("inventarioCritico.kpi.afectados", lang).ToLower()}",
            language: lang);

        return new AutomationResult(true, string.Format(M("inventarioCritico.result", lang), productosEnCero.Count));
    }
}
