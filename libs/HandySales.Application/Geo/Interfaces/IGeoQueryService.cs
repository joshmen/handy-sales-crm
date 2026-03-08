namespace HandySales.Application.Geo.Interfaces;

public interface IGeoQueryService
{
    Task<List<NearbyClienteDto>> GetNearbyClientesAsync(double lat, double lng, double radiusKm, int tenantId);
    Task<List<NearbyClienteDto>> GetNearbyUnservedAsync(double lat, double lng, double radiusKm, int daysSinceVisit, int tenantId);
    Task<List<NearbyClienteDto>> GetNearbyProspectsAsync(double lat, double lng, double radiusKm, int tenantId);
}

public record NearbyClienteDto(
    int Id,
    string Nombre,
    double DistanciaMetros,
    DateTime? UltimaVisita,
    DateTime? UltimoPedido,
    bool EsProspecto,
    double? Latitud,
    double? Longitud
);
