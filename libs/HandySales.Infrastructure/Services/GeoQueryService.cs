using HandySales.Application.Geo.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace HandySales.Infrastructure.Services;

public class GeoQueryService : IGeoQueryService
{
    private readonly HandySalesDbContext _db;
    private static readonly GeometryFactory _gf = NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    public GeoQueryService(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<NearbyClienteDto>> GetNearbyClientesAsync(double lat, double lng, double radiusKm, int tenantId)
    {
        var point = _gf.CreatePoint(new Coordinate(lng, lat));
        var radiusMeters = radiusKm * 1000;

        var clientes = await _db.Clientes
            .Where(c => c.TenantId == tenantId
                && c.Ubicacion != null
                && c.Ubicacion.Distance(point) <= radiusMeters / 111320.0) // rough degree filter for perf
            .Select(c => new
            {
                c.Id, c.Nombre, c.Latitud, c.Longitud, c.EsProspecto, c.Ubicacion
            })
            .ToListAsync();

        // Get last visit and last order per client
        var clienteIds = clientes.Select(c => c.Id).ToList();

        var ultimaVisita = await _db.ClienteVisitas
            .Where(v => clienteIds.Contains(v.ClienteId) && v.TenantId == tenantId)
            .GroupBy(v => v.ClienteId)
            .Select(g => new { ClienteId = g.Key, Fecha = g.Max(v => v.FechaHoraInicio) })
            .ToDictionaryAsync(x => x.ClienteId, x => x.Fecha);

        var ultimoPedido = await _db.Pedidos
            .Where(p => clienteIds.Contains(p.ClienteId) && p.TenantId == tenantId)
            .GroupBy(p => p.ClienteId)
            .Select(g => new { ClienteId = g.Key, Fecha = g.Max(p => p.FechaPedido) })
            .ToDictionaryAsync(x => x.ClienteId, x => x.Fecha);

        return clientes
            .Select(c =>
            {
                // Calculate real distance using Haversine-like (NTS Distance is in degrees, we need meters)
                var dist = c.Ubicacion != null && point != null
                    ? HaversineMeters(lat, lng, c.Latitud ?? 0, c.Longitud ?? 0)
                    : double.MaxValue;
                return new NearbyClienteDto(
                    c.Id, c.Nombre, Math.Round(dist, 1),
                    ultimaVisita.GetValueOrDefault(c.Id),
                    ultimoPedido.GetValueOrDefault(c.Id),
                    c.EsProspecto,
                    c.Latitud, c.Longitud
                );
            })
            .Where(c => c.DistanciaMetros <= radiusMeters)
            .OrderBy(c => c.DistanciaMetros)
            .ToList();
    }

    public async Task<List<NearbyClienteDto>> GetNearbyUnservedAsync(double lat, double lng, double radiusKm, int daysSinceVisit, int tenantId)
    {
        var all = await GetNearbyClientesAsync(lat, lng, radiusKm, tenantId);
        var cutoff = DateTime.UtcNow.AddDays(-daysSinceVisit);

        return all
            .Where(c => !c.EsProspecto && (c.UltimaVisita == null || c.UltimaVisita < cutoff))
            .ToList();
    }

    public async Task<List<NearbyClienteDto>> GetNearbyProspectsAsync(double lat, double lng, double radiusKm, int tenantId)
    {
        var all = await GetNearbyClientesAsync(lat, lng, radiusKm, tenantId);
        return all.Where(c => c.EsProspecto).ToList();
    }

    private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000.0; // Earth radius in meters
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0)
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2.0 * R * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
    }
}
