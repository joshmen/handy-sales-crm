using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations.Handlers;

public class StockBajoAlertaHandler : IAutomationHandler
{
    public string Slug => "stock-bajo-alerta";
    private const string Canal = "push";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
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
            return new AutomationResult(true, "Sin productos con stock bajo");

        // ── Push notification (brief) ──
        var productList = string.Join(", ", productosBajos.Take(5).Select(p => $"{p.Nombre} ({p.Cantidad}/{p.StockMinimo})"));
        var message = productosBajos.Count == 1
            ? $"El producto {productosBajos[0].Nombre} tiene stock bajo ({productosBajos[0].Cantidad} de {productosBajos[0].StockMinimo})"
            : $"{productosBajos.Count} productos con stock bajo: {productList}";

        await context.NotifyAsync("Alerta de stock bajo", message, "Alert", Canal, ct, "/inventory?alerta=stock_bajo");

        // ── Rich email report to admin ──
        var sinStock = productosBajos.Count(p => p.SinStock);
        var stockBajo = productosBajos.Count(p => !p.SinStock);

        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz));
        content.Append(EmailTemplateBuilder.KpiRow(
            ("Productos afectados", productosBajos.Count.ToString(), "⚠️"),
            ("Sin stock", sinStock.ToString(), "🚫"),
            ("Stock bajo", stockBajo.ToString(), "📦")
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
                ? "<span style=\"background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;\">SIN STOCK</span>"
                : "<span style=\"background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;\">STOCK BAJO</span>",
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading("Productos que requieren reabastecimiento"));
        content.Append(EmailTemplateBuilder.Table(
            new[] { "Producto", "Stock Actual", "Stock Mínimo", "Estado" }, rows));

        await context.SendAdminEmailAsync(
            "Alerta de Stock Bajo",
            content.ToString(),
            ct,
            $"{productosBajos.Count} productos necesitan reabastecimiento");

        return new AutomationResult(true, $"Alerta enviada: {productosBajos.Count} productos con stock bajo");
    }
}
