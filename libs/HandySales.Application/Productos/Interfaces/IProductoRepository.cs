using HandySales.Application.Productos.DTOs;

namespace HandySales.Application.Productos.Interfaces;

public interface IProductoRepository
{
    Task<List<ProductoDto>> ObtenerPorTenantAsync(int tenantId);
    Task<ProductoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(ProductoCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, ProductoCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<ProductoPaginatedResult> ObtenerPorFiltroAsync(ProductoFiltroDto filtro, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ActualizarImagenAsync(int id, string? imagenUrl, int tenantId);
}
