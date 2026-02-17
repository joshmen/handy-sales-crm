using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Application.CompanySettings.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.CompanySettings.Repositories
{
    public class CompanySettingsRepository : ICompanySettingsRepository
    {
        private readonly HandySalesDbContext _context;

        public CompanySettingsRepository(HandySalesDbContext context)
        {
            _context = context;
        }

        public async Task<CompanySetting?> GetByTenantIdAsync(int tenantId)
        {
            return await _context.CompanySettings
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);
        }

        public async Task<CompanySetting> CreateAsync(CompanySetting companySettings)
        {
            _context.CompanySettings.Add(companySettings);
            await _context.SaveChangesAsync();
            return companySettings;
        }

        public async Task<CompanySetting> UpdateAsync(CompanySetting companySettings)
        {
            _context.CompanySettings.Update(companySettings);
            await _context.SaveChangesAsync();
            return companySettings;
        }

        public async Task DeleteAsync(int id)
        {
            var companySettings = await _context.CompanySettings.FindAsync(id);
            if (companySettings != null)
            {
                _context.CompanySettings.Remove(companySettings);
                await _context.SaveChangesAsync();
            }
        }
    }
}