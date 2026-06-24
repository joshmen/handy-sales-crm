using HandySuites.Application.Vehiculos.DTOs;

namespace HandySuites.Application.Vehiculos.Interfaces;

public interface IVehiculoRepository
{
    Task<List<VehiculoDto>> ObtenerPorTenantAsync(int tenantId);
    Task<VehiculoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(CreateVehiculoDto dto, string creadoPor, int tenantId);
    Task<bool> ActualizarAsync(int id, UpdateVehiculoDto dto, string actualizadoPor, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ExistePlacaEnTenantAsync(string placa, int tenantId, int? excludeId = null);
    Task<bool> EsVendedorDelTenantAsync(int vendedorId, int tenantId);
}
