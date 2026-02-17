using HandySales.Application.Descuentos.DTOs;

namespace HandySales.Application.Descuentos.Interfaces;

public interface IDescuentoPorCantidadRepository
{
    Task<List<DescuentoPorCantidadDto>> ObtenerPorTenantAsync(int tenantId);
    Task<DescuentoPorCantidadDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<List<DescuentoPorCantidadDto>> ObtenerPorProductoIdAsync(int productoId, int tenantId);
    Task<int> CrearAsync(DescuentoPorCantidadCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, DescuentoPorCantidadCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<bool> ToggleActivoAsync(int id, int tenantId, string? usuarioActual = null);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId, string? usuarioActual = null);
    Task<bool> ExisteCantidadMinimaAsync(int? productoId, decimal cantidadMinima, int tenantId, int? excludeId = null);
    Task<List<DescuentoPorCantidadDto>> ObtenerEscalaDescuentosAsync(int? productoId, int tenantId, int? excludeId = null);
}
