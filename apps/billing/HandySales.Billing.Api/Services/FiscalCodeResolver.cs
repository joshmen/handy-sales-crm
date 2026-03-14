using HandySales.Billing.Api.Data;
using HandySales.Billing.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Billing.Api.Services;

/// <summary>
/// Resolves fiscal codes (ClaveProdServ, ClaveUnidad) for order line items.
/// Resolution chain: MapeoFiscalProducto → Producto.ClaveSat → DefaultsFiscalesTenant → hardcoded fallback.
/// </summary>
public class FiscalCodeResolver
{
    private readonly BillingDbContext _context;

    public FiscalCodeResolver(BillingDbContext context)
    {
        _context = context;
    }

    public record ResolvedFiscalCode(string ClaveProdServ, string ClaveUnidad, string Source);

    /// <summary>
    /// Resolves fiscal codes for a list of order lines.
    /// Returns a dictionary keyed by ProductoId.
    /// </summary>
    public async Task<Dictionary<int, ResolvedFiscalCode>> ResolveAsync(
        string tenantId,
        List<OrderLineForInvoice> lines)
    {
        var productIds = lines.Select(l => l.ProductoId).Distinct().ToList();

        // 1. Load tenant mappings (authoritative)
        var mappings = await _context.MapeosFiscalesProducto
            .Where(m => m.TenantId == tenantId && productIds.Contains(m.ProductoId))
            .ToDictionaryAsync(m => m.ProductoId);

        // 2. Load tenant defaults
        var defaults = await _context.DefaultsFiscalesTenant
            .FirstOrDefaultAsync(d => d.TenantId == tenantId);

        var defaultProdServ = defaults?.ClaveProdServDefault ?? "01010101";
        var defaultUnidad = defaults?.ClaveUnidadDefault ?? "H87";

        // 3. Resolve each product
        var result = new Dictionary<int, ResolvedFiscalCode>();
        foreach (var line in lines)
        {
            if (mappings.TryGetValue(line.ProductoId, out var mapping))
            {
                result[line.ProductoId] = new ResolvedFiscalCode(
                    mapping.ClaveProdServ, mapping.ClaveUnidad, "mapping");
            }
            else if (!string.IsNullOrEmpty(line.ProductoClaveSat))
            {
                result[line.ProductoId] = new ResolvedFiscalCode(
                    line.ProductoClaveSat,
                    line.UnidadClaveSat ?? defaultUnidad,
                    "producto");
            }
            else if (defaults != null)
            {
                result[line.ProductoId] = new ResolvedFiscalCode(
                    defaultProdServ, defaultUnidad, "default");
            }
            else
            {
                result[line.ProductoId] = new ResolvedFiscalCode(
                    "01010101", "H87", "fallback");
            }
        }

        return result;
    }
}
