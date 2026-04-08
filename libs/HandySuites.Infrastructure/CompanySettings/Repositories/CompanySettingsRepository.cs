using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Application.CompanySettings.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.CompanySettings.Repositories
{
    public class CompanySettingsRepository : ICompanySettingsRepository
    {
        private readonly HandySuitesDbContext _context;

        public CompanySettingsRepository(HandySuitesDbContext context)
        {
            _context = context;
        }

        public async Task<CompanySetting?> GetByTenantIdAsync(int tenantId)
        {
            return await _context.CompanySettings
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);
        }

        public async Task<Tenant?> GetTenantAsync(int tenantId)
        {
            return await _context.Tenants
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == tenantId);
        }

        public async Task<int> CountActiveUsersAsync(int tenantId)
        {
            return await _context.Usuarios
                .IgnoreQueryFilters()
                .AsNoTracking()
                .CountAsync(u => u.TenantId == tenantId && u.Activo);
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