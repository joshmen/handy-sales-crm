using HandySuites.Application.Inventario.DTOs;

namespace HandySuites.Application.Inventario.Interfaces;

public interface IInventarioRepository
{
    Task<List<InventarioDto>> ObtenerPorTenantAsync(int tenantId);
    Task<InventarioDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<InventarioDto?> ObtenerPorProductoIdAsync(int productoId, int tenantId);
    Task<int> CrearAsync(InventarioCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, InventarioUpdateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<InventarioPaginatedResult> ObtenerPorFiltroAsync(InventarioFiltroDto filtro, int tenantId);
    Task<bool> ExisteProductoEnTenantAsync(int productoId, int tenantId);
    Task AcquireProductoLockAsync(int tenantId, int productoId);
}
