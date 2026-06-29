using HandySuites.Domain.Entities;

namespace HandySuites.Application.SystemStatus.Interfaces;

public interface IIncidenteRepository
{
    Task<List<Incidente>> GetAllAsync();
    Task<Incidente?> GetByIdAsync(int id);
    Task<int> CreateAsync(Incidente incidente);
    Task<bool> UpdateAsync(Incidente incidente);
}
