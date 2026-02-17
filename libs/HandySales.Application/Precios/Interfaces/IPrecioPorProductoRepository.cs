using HandySales.Application.Precios.DTOs;

namespace HandySales.Application.Precios.Interfaces;

public interface IPrecioPorProductoRepository
{
    Task<List<PrecioPorProductoDto>> ObtenerPorTenantAsync(int tenantId);
    Task<PrecioPorProductoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<List<PrecioPorProductoDto>> ObtenerPorListaAsync(int listaPrecioId, int tenantId);
    Task<int> CrearAsync(PrecioPorProductoCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, PrecioPorProductoCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
}
