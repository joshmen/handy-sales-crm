using HandySales.Application.SubscriptionPlans.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Services;

public class SubscriptionEnforcementService : ISubscriptionEnforcementService
{
    private readonly HandySalesDbContext _db;

    public SubscriptionEnforcementService(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<EnforcementResult> CanCreateUsuarioAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return new EnforcementResult(true);

        var current = await _db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(u => u.TenantId == tenantId && u.Activo);

        if (current >= plan.MaxUsuarios)
            return new EnforcementResult(
                false,
                $"Tu plan {plan.Nombre} permite máximo {plan.MaxUsuarios} usuarios. Actualmente tienes {current}.",
                current,
                plan.MaxUsuarios);

        return new EnforcementResult(true, null, current, plan.MaxUsuarios);
    }

    public async Task<EnforcementResult> CanCreateProductoAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return new EnforcementResult(true);

        var current = await _db.Productos
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(p => p.TenantId == tenantId && p.Activo);

        if (current >= plan.MaxProductos)
            return new EnforcementResult(
                false,
                $"Tu plan {plan.Nombre} permite máximo {plan.MaxProductos} productos. Actualmente tienes {current}.",
                current,
                plan.MaxProductos);

        return new EnforcementResult(true, null, current, plan.MaxProductos);
    }

    public async Task<EnforcementResult> CanCreateClienteAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return new EnforcementResult(true);

        var current = await _db.Clientes
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(c => c.TenantId == tenantId && c.Activo);

        if (current >= plan.MaxClientesPorMes)
            return new EnforcementResult(
                false,
                $"Tu plan {plan.Nombre} permite máximo {plan.MaxClientesPorMes} clientes. Actualmente tienes {current}.",
                current,
                plan.MaxClientesPorMes);

        return new EnforcementResult(true, null, current, plan.MaxClientesPorMes);
    }

    private async Task<Domain.Entities.SubscriptionPlan?> GetPlanForTenantAsync(int tenantId)
    {
        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant == null || string.IsNullOrEmpty(tenant.PlanTipo))
            return null;

        // Normalize legacy plan codes (PROFESIONAL→PRO, BASICO→BASIC, Trial→FREE)
        var planCode = NormalizePlanCode(tenant.PlanTipo);

        return await _db.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Codigo == planCode && p.Activo);
    }

    private static string NormalizePlanCode(string? planTipo)
    {
        if (string.IsNullOrEmpty(planTipo)) return "FREE";
        return planTipo.ToUpperInvariant() switch
        {
            "TRIAL" => "FREE",
            "PROFESIONAL" or "PROFESSIONAL" => "PRO",
            "BASICO" or "STARTER" => "BASIC",
            _ => planTipo.ToUpperInvariant()
        };
    }
}
