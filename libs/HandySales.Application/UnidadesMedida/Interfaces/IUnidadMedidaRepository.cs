using HandySales.Application.UnidadesMedida.DTOs;

namespace HandySales.Application.UnidadesMedida.Interfaces;

public interface IUnidadMedidaRepository
{
    Task<List<UnidadMedidaDto>> ObtenerPorTenantAsync(int tenantId);
    Task<UnidadMedidaDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(UnidadMedidaCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, UnidadMedidaCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<int> ContarProductosPorUnidadAsync(int unidadId, int tenantId);
    Task<int> ContarProductosActivosPorUnidadAsync(int unidadId, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ExisteNombreAsync(string nombre, int tenantId, int? excludeId = null);
}
