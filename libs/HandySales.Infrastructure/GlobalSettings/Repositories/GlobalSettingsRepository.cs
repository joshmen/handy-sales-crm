using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Application.GlobalSettings.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.GlobalSettings.Repositories
{
    public class GlobalSettingsRepository : IGlobalSettingsRepository
    {
        private readonly HandySalesDbContext _context;

        public GlobalSettingsRepository(HandySalesDbContext context)
        {
            _context = context;
        }

        public async Task<Domain.Entities.GlobalSettings?> GetAsync()
        {
            // Solo debería existir un registro de configuración global
            return await _context.GlobalSettings.FirstOrDefaultAsync();
        }

        public async Task<Domain.Entities.GlobalSettings> CreateAsync(Domain.Entities.GlobalSettings globalSettings)
        {
            // Asegurar que solo exista un registro
            var existing = await GetAsync();
            if (existing != null)
            {
                throw new InvalidOperationException("Global settings already exist. Use Update instead.");
            }

            globalSettings.CreatedAt = DateTime.UtcNow;
            globalSettings.UpdatedAt = DateTime.UtcNow;
            
            _context.GlobalSettings.Add(globalSettings);
            await _context.SaveChangesAsync();
            return globalSettings;
        }

        public async Task<Domain.Entities.GlobalSettings> UpdateAsync(Domain.Entities.GlobalSettings globalSettings)
        {
            var existing = await GetAsync();
            if (existing == null)
            {
                throw new InvalidOperationException("Global settings do not exist. Use Create instead.");
            }

            // Preservar el ID y fecha de creación
            globalSettings.Id = existing.Id;
            globalSettings.CreatedAt = existing.CreatedAt;
            globalSettings.UpdatedAt = DateTime.UtcNow;

            _context.Entry(existing).CurrentValues.SetValues(globalSettings);
            await _context.SaveChangesAsync();
            return globalSettings;
        }
    }
}