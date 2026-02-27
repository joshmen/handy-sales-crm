using HandySales.Application.SubscriptionPlans.DTOs;
using HandySales.Domain.Entities;

namespace HandySales.Application.SubscriptionPlans.Interfaces;

public interface ISubscriptionPlanRepository
{
    Task<List<SubscriptionPlanAdminDto>> GetAllAsync(bool includeInactive = true);
    Task<SubscriptionPlan?> GetByIdAsync(int id);
    Task<SubscriptionPlan?> GetByCodigoAsync(string codigo);
    Task<int> CreateAsync(SubscriptionPlan plan);
    Task<bool> UpdateAsync(SubscriptionPlan plan);
    Task<bool> ToggleActivoAsync(int id);
    Task<int> GetTenantCountByPlanAsync(string codigo);
}
