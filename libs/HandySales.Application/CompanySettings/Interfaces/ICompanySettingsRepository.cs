using HandySales.Domain.Entities;

namespace HandySales.Application.CompanySettings.Interfaces
{
    public interface ICompanySettingsRepository
    {
        Task<CompanySetting?> GetByTenantIdAsync(int tenantId);
        Task<CompanySetting> CreateAsync(CompanySetting companySettings);
        Task<CompanySetting> UpdateAsync(CompanySetting companySettings);
        Task DeleteAsync(int id);
    }
}