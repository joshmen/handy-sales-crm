using HandySales.Application.Promociones.DTOs;

namespace HandySales.Application.Promociones.Interfaces;

public interface IPromocionRepository
{
    Task<List<PromocionDto>> ObtenerPorTenantAsync(int tenantId);
    Task<PromocionDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(PromocionCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, PromocionCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ExisteNombreAsync(string nombre, int tenantId, int? excludeId = null);
    Task<List<PromocionDto>> ObtenerPromocionesConProductoAsync(int productoId, int tenantId, int? excludeId = null);
}
