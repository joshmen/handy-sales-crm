using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Services;

public class SubscriptionEnforcementService : ISubscriptionEnforcementService
{
    private readonly HandySuitesDbContext _db;

    public SubscriptionEnforcementService(HandySuitesDbContext db)
    {
        _db = db;
    }

    // Advisory lock classification IDs (must be unique per resource type).
    // Shared across tenants: lock key is (tenantId, resourceId) so locks are per-tenant.
    private const int RESOURCE_USUARIOS = 1;
    private const int RESOURCE_PRODUCTOS = 2;
    private const int RESOURCE_CLIENTES = 3;
    private const int RESOURCE_TIMBRES = 4;

    // BR-020 (Audit CRITICAL-3, Abril 2026): to prevent two concurrent requests
    // from both passing `current < max` and both inserting, we acquire a
    // PostgreSQL transaction-scoped advisory lock before the COUNT.
    //
    // CALLER CONTRACT: the endpoint must call this method INSIDE an active
    // DbContext transaction, and the INSERT of the new entity must happen in
    // that same transaction. The lock is released automatically when the
    // transaction commits or rolls back. If not in a transaction, this still
    // works but degenerates to a session-scoped lock with an immediate auto-
    // commit, leaving the race window open — callers must respect the contract.
    //
    // Provider note: only issued against PostgreSQL. Unit tests run SQLite in-memory
    // and would fail on `pg_advisory_xact_lock`; we skip silently there since those
    // tests run single-threaded and don't need concurrency protection anyway.
    private async Task AcquireTenantResourceLockAsync(int tenantId, int resourceId)
    {
        if (!_db.Database.IsNpgsql()) return;

        await _db.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock({0}, {1})",
            tenantId, resourceId);
    }

    public async Task<EnforcementResult> CanCreateUsuarioAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return new EnforcementResult(true);

        await AcquireTenantResourceLockAsync(tenantId, RESOURCE_USUARIOS);

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

        await AcquireTenantResourceLockAsync(tenantId, RESOURCE_PRODUCTOS);

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

        await AcquireTenantResourceLockAsync(tenantId, RESOURCE_CLIENTES);

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

        // BR-021 (Audit MEDIUM-9, Abril 2026): acquire the same advisory lock that
        // RegistrarTimbreUsadoAsync implicitly serializes on, so pre-check and
        // atomic UPDATE see a consistent view of the counter. Caller should be
        // in a transaction for the lock to survive until the stamp is registered;
        // if not, the lock releases at the end of this statement and the read
        // below is still correct but a concurrent request may change things
        // before RegistrarTimbreUsadoAsync runs — in which case the atomic UPDATE
        // there will correctly deny the second request.
        await AcquireTenantResourceLockAsync(tenantId, RESOURCE_TIMBRES);

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

        var totalDisponible = plan.MaxTimbresMes + tenant.TimbresExtras;
        if (timbresUsados >= totalDisponible)
            return new EnforcementResult(
                false,
                tenant.TimbresExtras > 0
                    ? $"Has agotado tus {plan.MaxTimbresMes} timbres mensuales y {tenant.TimbresExtras} extras. Compra timbres adicionales."
                    : $"Tu plan {plan.Nombre} permite máximo {plan.MaxTimbresMes} timbres al mes. Has usado {timbresUsados}. Compra timbres adicionales.",
                timbresUsados, totalDisponible);

        return new EnforcementResult(true, null, timbresUsados, totalDisponible);
    }

    public async Task<bool> RegistrarTimbreUsadoAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return false;

        // BR-021: acquire the same lock CanUsarTimbreAsync uses so the pre-check
        // and this UPDATE see the same counter state within a transaction.
        await AcquireTenantResourceLockAsync(tenantId, RESOURCE_TIMBRES);

        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null) return false;

        var totalLimit = plan.MaxTimbresMes + tenant.TimbresExtras;

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
            tenantId, now.Month, now.Year, resetFecha, totalLimit);

        return rows > 0;
    }

    public async Task<EnforcementResult> CanGenerarFacturaAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return new EnforcementResult(false, "No se encontró un plan activo para este tenant.");

        if (!plan.IncluyeFacturacion)
            return new EnforcementResult(false, "Tu plan no incluye facturación electrónica.");

        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant == null)
            return new EnforcementResult(false, "Tenant no encontrado.");

        // Normalize: treat stale month as 0 used (atomic reset happens in RegistrarFacturaGeneradaAsync)
        var now = DateTime.UtcNow;
        var facturasGeneradas = tenant.FacturasGeneradasMes;
        if (tenant.FacturasResetFecha == null || tenant.FacturasResetFecha.Value.Month != now.Month || tenant.FacturasResetFecha.Value.Year != now.Year)
        {
            facturasGeneradas = 0;
        }

        if (facturasGeneradas >= plan.MaxFacturasMes)
        {
            // Over limit — still allow, Stripe metered billing will handle overage charges
            return new EnforcementResult(true, "Has excedido tu límite mensual de facturas. Se aplicarán cargos adicionales.", facturasGeneradas, plan.MaxFacturasMes);
        }

        return new EnforcementResult(true, null, facturasGeneradas, plan.MaxFacturasMes);
    }

    public async Task<bool> RegistrarFacturaGeneradaAsync(int tenantId)
    {
        var plan = await GetPlanForTenantAsync(tenantId);
        if (plan == null) return false;

        if (!plan.IncluyeFacturacion) return false;

        var now = DateTime.UtcNow;
        var resetFecha = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Atomic: reset counter if new month, then increment (no hard limit — overage billed via Stripe)
        var sql = @"
            UPDATE ""Tenants""
            SET ""FacturasGeneradasMes"" = CASE
                    WHEN ""FacturasResetFecha"" IS NULL
                         OR EXTRACT(MONTH FROM ""FacturasResetFecha"") != {1}
                         OR EXTRACT(YEAR FROM ""FacturasResetFecha"") != {2}
                    THEN 1
                    ELSE ""FacturasGeneradasMes"" + 1
                END,
                ""FacturasResetFecha"" = {3}
            WHERE ""Id"" = {0}";

        var rows = await _db.Database.ExecuteSqlRawAsync(sql,
            tenantId, now.Month, now.Year, resetFecha);

        return rows > 0;
    }

    public async Task AddExtraTimbresAsync(int tenantId, int cantidad)
    {
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""UPDATE "Tenants" SET "TimbresExtras" = "TimbresExtras" + {cantidad} WHERE "Id" = {tenantId}""");
    }

    private async Task<Domain.Entities.SubscriptionPlan?> GetPlanForTenantAsync(int tenantId)
    {
        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(t => t.SubscriptionPlan)
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant == null) return null;

        // Prefer FK navigation; fall back to string lookup for legacy data
        if (tenant.SubscriptionPlan != null)
            return tenant.SubscriptionPlan;

        if (string.IsNullOrEmpty(tenant.PlanTipo))
            return null;

        var planCode = NormalizePlanCode(tenant.PlanTipo);
        return await _db.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Codigo == planCode && p.Activo);
    }

    public static string NormalizePlanCode(string? planTipo)
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
