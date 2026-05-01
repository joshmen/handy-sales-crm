using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Subscriptions;

/// <summary>
/// Verifica feature flags del plan del tenant. Cachea la respuesta en memoria
/// del request actual (singleton de scope) para evitar 2 lookups si el mismo
/// request valida el mismo feature dos veces.
///
/// Mapeo de feature codes a propiedades del SubscriptionPlan — agregar acá
/// cuando salgan features nuevas.
/// </summary>
public class SubscriptionFeatureGuard : ISubscriptionFeatureGuard
{
    private readonly HandySuitesDbContext _db;
    private readonly Dictionary<(int, string), bool> _cache = new();

    public SubscriptionFeatureGuard(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task RequireFeatureAsync(int tenantId, string featureCode)
    {
        var hasIt = await HasFeatureAsync(tenantId, featureCode);
        if (!hasIt) throw new FeatureNotInPlanException(featureCode);
    }

    public async Task<bool> HasFeatureAsync(int tenantId, string featureCode)
    {
        if (_cache.TryGetValue((tenantId, featureCode), out var cached))
            return cached;

        var tenant = await _db.Tenants.AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Select(t => new { t.SubscriptionPlanId })
            .FirstOrDefaultAsync();

        if (tenant?.SubscriptionPlanId == null)
        {
            _cache[(tenantId, featureCode)] = false;
            return false;
        }

        var plan = await _db.SubscriptionPlans.AsNoTracking()
            .Where(p => p.Id == tenant.SubscriptionPlanId.Value)
            .FirstOrDefaultAsync();

        if (plan == null)
        {
            _cache[(tenantId, featureCode)] = false;
            return false;
        }

        var hasIt = featureCode switch
        {
            "tracking_vendedor" => plan.IncluyeTrackingVendedor,
            "facturacion" => plan.IncluyeFacturacion,
            "reportes" => plan.IncluyeReportes,
            "soporte_prioritario" => plan.IncluyeSoportePrioritario,
            _ => false,
        };

        _cache[(tenantId, featureCode)] = hasIt;
        return hasIt;
    }
}
