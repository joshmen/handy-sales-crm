using HandySales.Domain.Entities;

namespace HandySales.Application.GlobalSettings.Interfaces
{
    public interface IGlobalSettingsRepository
    {
        Task<Domain.Entities.GlobalSettings?> GetAsync();
        Task<Domain.Entities.GlobalSettings> CreateAsync(Domain.Entities.GlobalSettings globalSettings);
        Task<Domain.Entities.GlobalSettings> UpdateAsync(Domain.Entities.GlobalSettings globalSettings);
    }
}