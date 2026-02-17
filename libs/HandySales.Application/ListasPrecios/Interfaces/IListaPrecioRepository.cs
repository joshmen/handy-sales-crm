using HandySales.Application.ListasPrecios.DTOs;

namespace HandySales.Application.ListasPrecios.Interfaces;

public interface IListaPrecioRepository
{
    Task<List<ListaPrecioDto>> ObtenerPorTenantAsync(int tenantId);
    Task<ListaPrecioDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(ListaPrecioCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, ListaPrecioCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<int> ContarPreciosActivosPorListaAsync(int listaPrecioId, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ExisteNombreAsync(string nombre, int tenantId, int? excludeId = null);
}
