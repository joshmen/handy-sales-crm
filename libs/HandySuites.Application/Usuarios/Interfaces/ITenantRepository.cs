using HandySuites.Domain.Entities;

namespace HandySuites.Application.Usuarios.Interfaces;

public interface ITenantRepository
{
    Task<Tenant> CrearAsync(Tenant tenant);
    Task<Tenant?> GetByIdAsync(int tenantId);
    Task<List<Tenant>> GetAllAsync();
    Task<Tenant?> UpdateAsync(Tenant tenant);
    Task<bool> CambiarActivoAsync(int id, bool activo);
    Task<int> GetUsuarioCountAsync(int tenantId);
}
