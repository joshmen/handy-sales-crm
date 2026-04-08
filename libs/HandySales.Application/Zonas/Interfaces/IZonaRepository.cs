using HandySuites.Application.Zonas.DTOs;

namespace HandySuites.Application.Zonas.Interfaces;

public interface IZonaRepository
{
    Task<List<ZonaDto>> ObtenerPorTenantAsync(int tenantId);
    Task<ZonaDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(CreateZonaDto dto, string creadoPor, int tenantId);
    Task<bool> ActualizarAsync(int id, UpdateZonaDto dto, string actualizadoPor, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<int> ContarClientesPorZonaAsync(int zonaId, int tenantId);
    Task<int> ContarClientesActivosPorZonaAsync(int zonaId, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<List<(int Id, string Nombre, double Lat, double Lng, double RadioKm)>> ObtenerZonasConCoordenadasAsync(int tenantId, int? excludeId = null);
}
