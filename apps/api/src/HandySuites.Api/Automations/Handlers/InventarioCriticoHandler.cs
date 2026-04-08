using System.Text;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Automations.Handlers;

public class InventarioCriticoHandler : IAutomationHandler
{
    public string Slug => "inventario-critico";
    private const string Canal = "push";

    public async Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct)
    {
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
            return new AutomationResult(true, "Sin productos con inventario en cero");

        // ── Push notification (brief) ──
        var productList = string.Join(", ", productosEnCero.Take(5).Select(p => p.Nombre));
        var message = productosEnCero.Count == 1
            ? $"El producto {productosEnCero[0].Nombre} tiene inventario en cero"
            : $"{productosEnCero.Count} productos sin inventario: {productList}";

        await context.NotifyAsync("Inventario crítico", message, "Alert", Canal, ct, "/inventory?alerta=critico");

        // ── Rich email report to admin ──
        var content = new StringBuilder();
        content.Append(EmailTemplateBuilder.DateStamp(DateTime.UtcNow, tenantTz));
        content.Append(EmailTemplateBuilder.KpiRow(
            ("Productos agotados", productosEnCero.Count.ToString(), "🚫"),
            ("Acción requerida", "Inmediata", "🔴")
        ));
        content.Append(EmailTemplateBuilder.Callout(
            $"<strong>{productosEnCero.Count} producto{(productosEnCero.Count != 1 ? "s" : "")}</strong> tienen inventario en cero. " +
            "Los vendedores no podrán ofrecerlos hasta que se reabastezcan. Revisa tus proveedores.",
            "error"));

        var rows = productosEnCero.Select(p => new[]
        {
            System.Net.WebUtility.HtmlEncode(p.Nombre),
            "<span style=\"color:#dc2626;font-weight:700;\">0</span>",
            p.StockMinimo > 0
                ? p.StockMinimo.ToString("N0")
                : "<span style=\"color:#9ca3af;\">—</span>",
        }).ToList();

        content.Append(EmailTemplateBuilder.SectionHeading("Productos sin existencias"));
        content.Append(EmailTemplateBuilder.Table(
            new[] { "Producto", "Stock Actual", "Stock Mínimo" }, rows));

        await context.SendAdminEmailAsync(
            "Inventario Crítico — Acción Inmediata",
            content.ToString(),
            ct,
            $"URGENTE: {productosEnCero.Count} productos agotados");

        return new AutomationResult(true, $"Alerta enviada: {productosEnCero.Count} productos sin inventario");
    }
}
