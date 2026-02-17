using HandySales.Application.CategoriasProductos.DTOs;

namespace HandySales.Application.CategoriasProductos.Interfaces;

public interface ICategoriaProductoRepository
{
    Task<List<CategoriaProductoDto>> ObtenerPorTenantAsync(int tenantId);
    Task<CategoriaProductoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(CategoriaProductoCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, CategoriaProductoCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<int> ContarProductosPorCategoriaAsync(int categoriaId, int tenantId);
    Task<int> ContarProductosActivosPorCategoriaAsync(int categoriaId, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ExisteNombreAsync(string nombre, int tenantId, int? excludeId = null);
}
