using HandySuites.Application.DatosFacturacion.DTOs;

namespace HandySuites.Application.DatosFacturacion.Interfaces
{
    public interface IDatosFacturacionService
    {
        Task<DatosFacturacionDto?> GetByTenantAsync(int tenantId);
        Task<DatosFacturacionDto?> CreateAsync(int tenantId, int userId, CreateDatosFacturacionRequest request);
        Task<DatosFacturacionDto?> UpdateAsync(int tenantId, int userId, UpdateDatosFacturacionRequest request);
        Task<bool> DeleteAsync(int tenantId, int userId);
    }
}