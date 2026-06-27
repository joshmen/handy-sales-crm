using HandySuites.Application.Modulos.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Modulos.Interfaces;

public interface IModuloRepository
{
    Task<List<ModuloMatrizDto>> GetMatrizAsync();
    Task<ModuloDto?> GetByIdAsync(int id);
    Task<ModuloPlataforma?> GetEntityByIdAsync(int id);
    Task<ModuloPlataforma?> GetByClaveAsync(string clave);
    Task<int> CreateAsync(ModuloPlataforma modulo);
    Task<bool> UpdateAsync(ModuloPlataforma modulo);
    Task<bool> DeleteAsync(int id);

    Task<List<ModuloOverrideDto>> GetOverridesAsync();
    Task<ModuloOverride?> GetOverrideEntityByIdAsync(int id);
    Task<ModuloOverride?> GetOverrideByModuloTenantAsync(int moduloPlataformaId, int tenantId);
    Task<int> CreateOverrideAsync(ModuloOverride overrideEntity);
    Task<bool> DeleteOverrideAsync(int id);
}
