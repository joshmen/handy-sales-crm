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
            .CountAsync(u => u.TenantId == tenantId && u.Activo && u.EliminadoEn == null);

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
            .CountAsync(p => p.TenantId == tenantId && p.Activo && p.EliminadoEn == null);

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

        // NOTE: MaxClientesPorMes is a misnomer — it actually limits total active clients,
        // not clients created per month. The query below counts ALL active clients, not monthly ones.
        var current = await _db.Clientes
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(c => c.TenantId == tenantId && c.Activo && c.EliminadoEn == null);

        if (current >= plan.MaxClientesPorMes)
            return new EnforcementResult(
                false,
                $"Tu plan {plan.Nombre} permite máximo {plan.MaxClientesPorMes} clientes. Actualmente tienes {current}.",
                current,
                plan.MaxClientesPorMes);

        return new EnforcementResult(true, null, current, plan.MaxClientesPorMes);
    }

    public async Task<EnforcementResult> CanUsarTimbreAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return new EnforcementResult(false, "No se encontró un plan activo para este tenant.");

        if (plan.MaxTimbresMes <= 0)
            return new EnforcementResult(false, "Tu plan no incluye facturación electrónica. Actualiza tu plan para timbrar facturas.");

        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant == null)
            return new EnforcementResult(false, "Tenant no encontrado.");

        // Normalize: treat stale month as 0 used (atomic reset happens in RegistrarTimbreUsadoAsync)
        var now = DateTime.UtcNow;
        var timbresUsados = tenant.TimbresUsadosMes;
        if (tenant.TimbresResetFecha == null || tenant.TimbresResetFecha.Value.Month != now.Month || tenant.TimbresResetFecha.Value.Year != now.Year)
        {
            timbresUsados = 0;
        }

        if (timbresUsados >= plan.MaxTimbresMes)
            return new EnforcementResult(
                false,
                $"Tu plan {plan.Nombre} permite máximo {plan.MaxTimbresMes} timbres al mes. Has usado {timbresUsados}.",
                timbresUsados,
                plan.MaxTimbresMes);

        return new EnforcementResult(true, null, timbresUsados, plan.MaxTimbresMes);
    }

    public async Task<bool> RegistrarTimbreUsadoAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return false;

        var now = DateTime.UtcNow;
        var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Atomic: reset counter if new month, then increment only if under limit
        var sql = @"
            UPDATE ""Tenants""
            SET ""TimbresUsadosMes"" = CASE
                    WHEN ""TimbresResetFecha"" IS NULL
                         OR EXTRACT(MONTH FROM ""TimbresResetFecha"") != {1}
                         OR EXTRACT(YEAR FROM ""TimbresResetFecha"") != {2}
                    THEN 1
                    ELSE ""TimbresUsadosMes"" + 1
                END,
                ""TimbresResetFecha"" = {3}
            WHERE ""Id"" = {0}
              AND (
                  ""TimbresResetFecha"" IS NULL
                  OR EXTRACT(MONTH FROM ""TimbresResetFecha"") != {1}
                  OR EXTRACT(YEAR FROM ""TimbresResetFecha"") != {2}
                  OR ""TimbresUsadosMes"" < {4}
              )";

        var rows = await _db.Database.ExecuteSqlRawAsync(sql,
            tenantId, now.Month, now.Year, resetFecha, plan.MaxTimbresMes);

        return rows > 0;
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
