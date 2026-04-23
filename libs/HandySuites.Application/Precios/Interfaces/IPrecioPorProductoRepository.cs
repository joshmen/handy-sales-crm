using HandySuites.Application.Precios.DTOs;

namespace HandySuites.Application.Precios.Interfaces;

public interface IPrecioPorProductoRepository
{
    Task<List<PrecioPorProductoDto>> ObtenerPorTenantAsync(int tenantId);
    Task<PrecioPorProductoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<List<PrecioPorProductoDto>> ObtenerPorListaAsync(int listaPrecioId, int tenantId);
    Task<int> CrearAsync(PrecioPorProductoCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, PrecioPorProductoCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    /// <summary>
    /// Verifica si ya existe un precio para el combo (productoId, listaPrecioId) en
    /// el tenant. Al editar se excluye el id actual via excludeId.
    /// </summary>
    Task<bool> ExisteComboAsync(int productoId, int listaPrecioId, int tenantId, int? excludeId);
}
