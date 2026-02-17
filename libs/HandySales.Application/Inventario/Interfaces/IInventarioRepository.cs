using HandySales.Application.Inventario.DTOs;

namespace HandySales.Application.Inventario.Interfaces;

public interface IInventarioRepository
{
    Task<List<InventarioDto>> ObtenerPorTenantAsync(int tenantId);
    Task<InventarioDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<InventarioDto?> ObtenerPorProductoIdAsync(int productoId, int tenantId);
    Task<int> CrearAsync(InventarioCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int productoId, InventarioUpdateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<InventarioPaginatedResult> ObtenerPorFiltroAsync(InventarioFiltroDto filtro, int tenantId);
}
