using HandySales.Application.Geo.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Services;

public class GeoQueryService : IGeoQueryService
{
    private readonly HandySalesDbContext _db;

    public GeoQueryService(HandySalesDbContext db)
    {
        _db = db;
    }

    // Haversine formula in native PostgreSQL math (no PostGIS required).
    // Earth radius = 6371000 meters. Uses LEAST(1.0, ...) to clamp floating-point rounding.
    // Bounding-box pre-filter on lat/lng for performance (replaces GIST index).
    private const string HaversineSql = @"
        ROUND((6371000 * acos(LEAST(1.0,
            cos(radians({0})) * cos(radians(c.latitud)) * cos(radians(c.longitud) - radians({1})) +
            sin(radians({0})) * sin(radians(c.latitud))
        )))::numeric, 1)";

    public async Task<List<NearbyClienteDto>> GetNearbyClientesAsync(double lat, double lng, double radiusKm, int tenantId)
    {
        var radiusMeters = radiusKm * 1000;
        var degDelta = radiusKm / 111.0; // ~1 degree = 111 km

        var results = await _db.Database
            .SqlQueryRaw<NearbyClienteRow>($@"
                SELECT
                    c.id AS ""Id"",
                    c.nombre AS ""Nombre"",
                    {HaversineSql} AS ""DistanciaMetros"",
                    uv.ultima_visita AS ""UltimaVisita"",
                    up.ultimo_pedido AS ""UltimoPedido"",
                    c.es_prospecto AS ""EsProspecto"",
                    c.latitud AS ""Latitud"",
                    c.longitud AS ""Longitud""
                FROM ""Clientes"" c
                LEFT JOIN LATERAL (
                    SELECT MAX(v.fecha_hora_inicio) AS ultima_visita
                    FROM ""ClienteVisitas"" v
                    WHERE v.cliente_id = c.id AND v.tenant_id = {{2}}
                      AND v.eliminado_en IS NULL
                ) uv ON true
                LEFT JOIN LATERAL (
                    SELECT MAX(p.fecha_pedido) AS ultimo_pedido
                    FROM ""Pedidos"" p
                    WHERE p.cliente_id = c.id AND p.tenant_id = {{2}}
                      AND p.eliminado_en IS NULL
                ) up ON true
                WHERE c.tenant_id = {{2}}
                  AND c.activo = true
                  AND c.eliminado_en IS NULL
                  AND c.latitud IS NOT NULL AND c.longitud IS NOT NULL
                  AND c.latitud BETWEEN {{0}} - {{3}} AND {{0}} + {{3}}
                  AND c.longitud BETWEEN {{1}} - {{4}} AND {{1}} + {{4}}
                  AND {HaversineSql} <= {{5}}
                ORDER BY {HaversineSql}",
                lat, lng, tenantId, degDelta, degDelta / Math.Cos(lat * Math.PI / 180), radiusMeters)
            .ToListAsync();

        return results.Select(r => new NearbyClienteDto(
            r.Id, r.Nombre, r.DistanciaMetros,
            r.UltimaVisita, r.UltimoPedido,
            r.EsProspecto, r.Latitud, r.Longitud
        )).ToList();
    }

    public async Task<List<NearbyClienteDto>> GetNearbyUnservedAsync(double lat, double lng, double radiusKm, int daysSinceVisit, int tenantId)
    {
        var radiusMeters = radiusKm * 1000;
        var degDelta = radiusKm / 111.0;
        var cutoff = DateTime.UtcNow.AddDays(-daysSinceVisit);

        var results = await _db.Database
            .SqlQueryRaw<NearbyClienteRow>($@"
                SELECT
                    c.id AS ""Id"",
                    c.nombre AS ""Nombre"",
                    {HaversineSql} AS ""DistanciaMetros"",
                    uv.ultima_visita AS ""UltimaVisita"",
                    up.ultimo_pedido AS ""UltimoPedido"",
                    c.es_prospecto AS ""EsProspecto"",
                    c.latitud AS ""Latitud"",
                    c.longitud AS ""Longitud""
                FROM ""Clientes"" c
                LEFT JOIN LATERAL (
                    SELECT MAX(v.fecha_hora_inicio) AS ultima_visita
                    FROM ""ClienteVisitas"" v
                    WHERE v.cliente_id = c.id AND v.tenant_id = {{2}}
                      AND v.eliminado_en IS NULL
                ) uv ON true
                LEFT JOIN LATERAL (
                    SELECT MAX(p.fecha_pedido) AS ultimo_pedido
                    FROM ""Pedidos"" p
                    WHERE p.cliente_id = c.id AND p.tenant_id = {{2}}
                      AND p.eliminado_en IS NULL
                ) up ON true
                WHERE c.tenant_id = {{2}}
                  AND c.activo = true
                  AND c.eliminado_en IS NULL
                  AND c.latitud IS NOT NULL AND c.longitud IS NOT NULL
                  AND c.es_prospecto = false
                  AND c.latitud BETWEEN {{0}} - {{3}} AND {{0}} + {{3}}
                  AND c.longitud BETWEEN {{1}} - {{4}} AND {{1}} + {{4}}
                  AND {HaversineSql} <= {{5}}
                  AND (uv.ultima_visita IS NULL OR uv.ultima_visita < {{6}})
                ORDER BY {HaversineSql}",
                lat, lng, tenantId, degDelta, degDelta / Math.Cos(lat * Math.PI / 180), radiusMeters, cutoff)
            .ToListAsync();

        return results.Select(r => new NearbyClienteDto(
            r.Id, r.Nombre, r.DistanciaMetros,
            r.UltimaVisita, r.UltimoPedido,
            r.EsProspecto, r.Latitud, r.Longitud
        )).ToList();
    }

    public async Task<List<NearbyClienteDto>> GetNearbyProspectsAsync(double lat, double lng, double radiusKm, int tenantId)
    {
        var radiusMeters = radiusKm * 1000;
        var degDelta = radiusKm / 111.0;

        var results = await _db.Database
            .SqlQueryRaw<NearbyClienteRow>($@"
                SELECT
                    c.id AS ""Id"",
                    c.nombre AS ""Nombre"",
                    {HaversineSql} AS ""DistanciaMetros"",
                    uv.ultima_visita AS ""UltimaVisita"",
                    up.ultimo_pedido AS ""UltimoPedido"",
                    c.es_prospecto AS ""EsProspecto"",
                    c.latitud AS ""Latitud"",
                    c.longitud AS ""Longitud""
                FROM ""Clientes"" c
                LEFT JOIN LATERAL (
                    SELECT MAX(v.fecha_hora_inicio) AS ultima_visita
                    FROM ""ClienteVisitas"" v
                    WHERE v.cliente_id = c.id AND v.tenant_id = {{2}}
                      AND v.eliminado_en IS NULL
                ) uv ON true
                LEFT JOIN LATERAL (
                    SELECT MAX(p.fecha_pedido) AS ultimo_pedido
                    FROM ""Pedidos"" p
                    WHERE p.cliente_id = c.id AND p.tenant_id = {{2}}
                      AND p.eliminado_en IS NULL
                ) up ON true
                WHERE c.tenant_id = {{2}}
                  AND c.activo = true
                  AND c.eliminado_en IS NULL
                  AND c.latitud IS NOT NULL AND c.longitud IS NOT NULL
                  AND c.es_prospecto = true
                  AND c.latitud BETWEEN {{0}} - {{3}} AND {{0}} + {{3}}
                  AND c.longitud BETWEEN {{1}} - {{4}} AND {{1}} + {{4}}
                  AND {HaversineSql} <= {{5}}
                ORDER BY {HaversineSql}",
                lat, lng, tenantId, degDelta, degDelta / Math.Cos(lat * Math.PI / 180), radiusMeters)
            .ToListAsync();

        return results.Select(r => new NearbyClienteDto(
            r.Id, r.Nombre, r.DistanciaMetros,
            r.UltimaVisita, r.UltimoPedido,
            r.EsProspecto, r.Latitud, r.Longitud
        )).ToList();
    }

    // Row type for SqlQueryRaw mapping
    private class NearbyClienteRow
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";
        public double DistanciaMetros { get; set; }
        public DateTime? UltimaVisita { get; set; }
        public DateTime? UltimoPedido { get; set; }
        public bool EsProspecto { get; set; }
        public double? Latitud { get; set; }
        public double? Longitud { get; set; }
    }
}
