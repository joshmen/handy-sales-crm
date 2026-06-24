using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Services;

public class ReportAccessService : IReportAccessService
{
    private readonly HandySuitesDbContext _db;

    // Tier definitions — 3 tiers fieles al rediseño Claude Design (Free / PRO / Contabilidad).
    // Subconjuntos: free ⊂ pro ⊂ contabilidad. Incluye IDs existentes + los nuevos del mock
    // (algunos aún sin vista — quedan gateados/placeholder hasta sus fases).
    private static readonly string[] FreeReports =
    {
        "ejecutivo", "ventas-periodo", "ventas-vendedor", "cartera-vencida",
        "estado-cuenta", "cobranza-periodo", "inv-valorizado", "kardex",
        "cumplimiento-metas", "efectividad-visitas", "inventario", "nuevos-clientes",
    };
    private static readonly string[] ProExtra =
    {
        "ventas-producto", "analisis-abc", "ventas-zona", "ventas-cliente",
        "rentabilidad-cliente", "comparativo", "insights",
        "comisiones", "margen", "rotacion", "por-vencer",
    };
    private static readonly string[] ContabilidadExtra =
    {
        "edo-resultados", "balance-general", "balanza",
        "iva", "diot", "conta-elec", "paquete-contador",
    };

    private static readonly Dictionary<string, HashSet<string>> TierReports = new()
    {
        ["free"] = new HashSet<string>(FreeReports),
        ["pro"] = new HashSet<string>(FreeReports.Concat(ProExtra)),
        ["contabilidad"] = new HashSet<string>(FreeReports.Concat(ProExtra).Concat(ContabilidadExtra)),
    };

    private static readonly Dictionary<string, int?> TierMaxDays = new()
    {
        ["free"] = 7,
        ["pro"] = null,           // unlimited
        ["contabilidad"] = null,  // unlimited
    };

    public ReportAccessService(HandySuitesDbContext db) => _db = db;

    public async Task<ReportAccessResult> CanAccessReportAsync(int tenantId, string reportSlug)
    {
        var tier = await GetTierForTenantAsync(tenantId);

        var allowed = TierReports.GetValueOrDefault(tier, TierReports["free"]);
        if (allowed.Contains(reportSlug))
            return new ReportAccessResult(true);

        // Tier mínimo que incluye este reporte (free → pro → contabilidad).
        var requiredTier = TierReports["free"].Contains(reportSlug) ? "free"
            : TierReports["pro"].Contains(reportSlug) ? "pro"
            : "contabilidad";

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
            // Planes comerciales intermedios mapean a PRO (acceso a reportes analíticos).
            "basico" or "basic" or "profesional" or "professional" or "pro" or "business" => "pro",
            // Tier contable (add-on) o enterprise = acceso total incl. financieros/fiscales.
            "contabilidad" or "accounting" or "enterprise" or "empresa" => "contabilidad",
            _ => "free"
        };
    }
}
