using HandySales.Application.FamiliasProductos.DTOs;

namespace HandySales.Application.FamiliasProductos.Interfaces;

public interface IFamiliaProductoRepository
{
    Task<List<FamiliaProductoDto>> ObtenerPorTenantAsync(int tenantId);
    Task<FamiliaProductoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(FamiliaProductoCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, FamiliaProductoCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<int> ContarProductosPorFamiliaAsync(int familiaId, int tenantId);
    Task<int> ContarProductosActivosPorFamiliaAsync(int familiaId, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ExisteNombreAsync(string nombre, int tenantId, int? excludeId = null);
}
