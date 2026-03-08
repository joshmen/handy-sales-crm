using HandySales.Application.SubscriptionPlans.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Services;

public class ReportAccessService : IReportAccessService
{
    private readonly HandySalesDbContext _db;

    // Tier definitions — hardcoded to avoid migration
    private static readonly Dictionary<string, HashSet<string>> TierReports = new()
    {
        ["free"] = new HashSet<string>
        {
            "ejecutivo", "ventas-periodo", "inventario", "nuevos-clientes"
        },
        ["basico"] = new HashSet<string>
        {
            "ejecutivo", "ventas-periodo", "inventario", "nuevos-clientes",
            "ventas-vendedor", "ventas-producto", "ventas-zona", "actividad-clientes",
            "cartera-vencida", "cumplimiento-metas", "comparativo", "efectividad-visitas"
        },
        ["profesional"] = new HashSet<string>
        {
            "ejecutivo", "ventas-periodo", "inventario", "nuevos-clientes",
            "ventas-vendedor", "ventas-producto", "ventas-zona", "actividad-clientes",
            "cartera-vencida", "cumplimiento-metas", "comparativo", "efectividad-visitas",
            "comisiones", "rentabilidad-cliente", "analisis-abc", "insights"
        }
    };

    private static readonly Dictionary<string, int?> TierMaxDays = new()
    {
        ["free"] = 7,
        ["basico"] = null,       // unlimited
        ["profesional"] = null   // unlimited
    };

    public ReportAccessService(HandySalesDbContext db) => _db = db;

    public async Task<ReportAccessResult> CanAccessReportAsync(int tenantId, string reportSlug)
    {
        var tier = await GetTierForTenantAsync(tenantId);

        if (tier == "profesional" || tier == "enterprise")
            return new ReportAccessResult(true);

        var allowed = TierReports.GetValueOrDefault(tier, TierReports["free"]);
        if (allowed.Contains(reportSlug))
            return new ReportAccessResult(true);

        // Find the minimum tier that includes this report
        var requiredTier = "profesional";
        if (TierReports["basico"].Contains(reportSlug))
            requiredTier = "basico";

        return new ReportAccessResult(
            false,
            $"Este reporte requiere el plan {requiredTier.ToUpper()}. Tu plan actual es {tier.ToUpper()}.",
            requiredTier
        );
    }

    public async Task<ReportTierInfo> GetReportTierInfoAsync(int tenantId)
    {
        var tier = await GetTierForTenantAsync(tenantId);
        var allowed = TierReports.GetValueOrDefault(tier, TierReports["free"]);
        var maxDays = TierMaxDays.GetValueOrDefault(tier, 7);

        return new ReportTierInfo(tier, allowed.ToList(), maxDays);
    }

    private async Task<string> GetTierForTenantAsync(int tenantId)
    {
        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Select(t => t.PlanTipo)
            .FirstOrDefaultAsync();

        if (string.IsNullOrEmpty(tenant))
            return "free";

        return tenant.ToLower() switch
        {
            "free" or "gratis" => "free",
            "basico" or "basic" => "basico",
            "profesional" or "professional" or "pro" => "profesional",
            "enterprise" or "empresa" => "enterprise",
            _ => "free"
        };
    }
}
