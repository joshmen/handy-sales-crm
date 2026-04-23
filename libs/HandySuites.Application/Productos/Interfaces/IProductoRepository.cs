using HandySuites.Application.Productos.DTOs;

namespace HandySuites.Application.Productos.Interfaces;

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
    Task<bool> ExisteFamiliaAsync(int familiaId, int tenantId);
    Task<bool> ExisteCategoriaAsync(int categoriaId, int tenantId);
    Task<bool> ExisteUnidadMedidaAsync(int unidadId);
    /// <summary>
    /// Devuelve el número de detalles de pedidos no terminales que referencian
    /// este producto. Si > 0 no se debería permitir borrar el producto — los
    /// pedidos activos perderían el nombre/precio snapshot al ocultarse el
    /// producto por el global query filter (EliminadoEn == null).
    /// </summary>
    Task<int> ContarPedidosActivosAsync(int productoId, int tenantId);
    /// <summary>
    /// Verifica si existe otro producto con el mismo código de barras en el
    /// tenant. excludeId permite excluirse a sí mismo al actualizar.
    /// </summary>
    Task<bool> ExisteCodigoBarraAsync(string codigoBarra, int tenantId, int? excludeId);
}
