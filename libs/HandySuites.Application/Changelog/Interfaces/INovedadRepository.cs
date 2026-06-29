using HandySuites.Domain.Entities;

namespace HandySuites.Application.Changelog.Interfaces;

public interface INovedadRepository
{
    Task<List<Novedad>> GetAllAsync();
    Task<Novedad?> GetByIdAsync(int id);
    Task<int> CreateAsync(Novedad novedad);
    Task<bool> UpdateAsync(Novedad novedad);
    Task<bool> RemoveAsync(int id);
}
