using HandySuites.Application.Zonas.DTOs;

namespace HandySuites.Application.Zonas.Interfaces;

public interface IZonaRepository
{
    Task<List<ZonaDto>> ObtenerPorTenantAsync(int tenantId);

    /// <summary>
    /// Como ObtenerPorTenantAsync pero con stats agregadas (VentasMes, TicketPromedio,
    /// CoberturaPct). desdeUtc/hastaUtc delimitan el mes actual del tenant (bordes UTC
    /// calculados en el service vía ITenantTimeZoneService). nowUtc es el instante de
    /// referencia para la ventana de cobertura por frecuencia.
    /// </summary>
    Task<List<ZonaDto>> ObtenerStatsPorTenantAsync(int tenantId, DateTime desdeUtc, DateTime hastaUtc, DateTime nowUtc);

    Task<ZonaDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(CreateZonaDto dto, string creadoPor, int tenantId);
    Task<bool> ActualizarAsync(int id, UpdateZonaDto dto, string actualizadoPor, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<int> ContarClientesPorZonaAsync(int zonaId, int tenantId);
    Task<int> ContarClientesActivosPorZonaAsync(int zonaId, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<List<(int Id, string Nombre, double Lat, double Lng, double RadioKm)>> ObtenerZonasConCoordenadasAsync(int tenantId, int? excludeId = null);
    Task<bool> ExisteNombreEnTenantAsync(string nombre, int tenantId, int? excludeId = null);
    Task<bool> EsVendedorDelTenantAsync(int vendedorId, int tenantId);
}
