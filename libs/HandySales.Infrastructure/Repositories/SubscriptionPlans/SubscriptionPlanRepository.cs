using HandySales.Application.SubscriptionPlans.DTOs;
using HandySales.Application.SubscriptionPlans.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories.SubscriptionPlans;

public class SubscriptionPlanRepository : ISubscriptionPlanRepository
{
    private readonly HandySalesDbContext _db;

    public SubscriptionPlanRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<SubscriptionPlanAdminDto>> GetAllAsync(bool includeInactive = true)
    {
        var query = _db.SubscriptionPlans.AsNoTracking();

        if (!includeInactive)
            query = query.Where(p => p.Activo);

        return await query
            .OrderBy(p => p.Orden)
            .Select(p => new SubscriptionPlanAdminDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Codigo = p.Codigo,
                PrecioMensual = p.PrecioMensual,
                PrecioAnual = p.PrecioAnual,
                MaxUsuarios = p.MaxUsuarios,
                MaxProductos = p.MaxProductos,
                MaxClientesPorMes = p.MaxClientesPorMes,
                IncluyeReportes = p.IncluyeReportes,
                IncluyeSoportePrioritario = p.IncluyeSoportePrioritario,
                Caracteristicas = p.Caracteristicas,
                Activo = p.Activo,
                Orden = p.Orden,
                TenantCount = _db.Tenants
                    .IgnoreQueryFilters()
                    .Count(t => t.PlanTipo == p.Codigo && t.Activo)
            })
            .ToListAsync();
    }

    public async Task<SubscriptionPlan?> GetByIdAsync(int id)
    {
        return await _db.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<SubscriptionPlan?> GetByCodigoAsync(string codigo)
    {
        return await _db.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Codigo == codigo);
    }

    public async Task<int> CreateAsync(SubscriptionPlan plan)
    {
        _db.SubscriptionPlans.Add(plan);
        await _db.SaveChangesAsync();
        return plan.Id;
    }

    public async Task<bool> UpdateAsync(SubscriptionPlan plan)
    {
        _db.SubscriptionPlans.Update(plan);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleActivoAsync(int id)
    {
        var plan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Id == id);
        if (plan == null) return false;

        plan.Activo = !plan.Activo;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> GetTenantCountByPlanAsync(string codigo)
    {
        return await _db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(t => t.PlanTipo == codigo && t.Activo);
    }
}
