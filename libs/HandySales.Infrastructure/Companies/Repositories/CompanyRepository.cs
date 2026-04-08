using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Application.Companies.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Companies.Repositories
{
    public class CompanyRepository : ICompanyRepository
    {
        private readonly HandySuitesDbContext _context;

        public CompanyRepository(HandySuitesDbContext context)
        {
            _context = context;
        }

        public async Task<Company?> GetByTenantIdAsync(int tenantId)
        {
            return await _context.Companies
                .Include(c => c.CompanySettings)
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);
        }

        public async Task<Company?> GetByIdAsync(int id)
        {
            return await _context.Companies
                .Include(c => c.CompanySettings)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<IEnumerable<Company>> GetAllAsync()
        {
            return await _context.Companies
                .Include(c => c.CompanySettings)
                .Where(c => c.IsActive)
                .OrderBy(c => c.CompanyName)
                .ToListAsync();
        }

        public async Task<Company> CreateAsync(Company company)
        {
            company.CreatedAt = DateTime.UtcNow;
            company.UpdatedAt = DateTime.UtcNow;
            
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();
            return company;
        }

        public async Task<Company> UpdateAsync(Company company)
        {
            company.UpdatedAt = DateTime.UtcNow;
            
            _context.Companies.Update(company);
            await _context.SaveChangesAsync();
            return company;
        }

        public async Task DeleteAsync(int id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company != null)
            {
                // Soft delete
                company.IsActive = false;
                company.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ExistsByTenantIdAsync(int tenantId)
        {
            return await _context.Companies
                .AnyAsync(c => c.TenantId == tenantId && c.IsActive);
        }
    }
}