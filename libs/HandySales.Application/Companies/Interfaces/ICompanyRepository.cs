using HandySales.Domain.Entities;

namespace HandySales.Application.Companies.Interfaces
{
    public interface ICompanyRepository
    {
        Task<Company?> GetByTenantIdAsync(int tenantId);
        Task<Company?> GetByIdAsync(int id);
        Task<IEnumerable<Company>> GetAllAsync();
        Task<Company> CreateAsync(Company company);
        Task<Company> UpdateAsync(Company company);
        Task DeleteAsync(int id);
        Task<bool> ExistsByTenantIdAsync(int tenantId);
    }
}