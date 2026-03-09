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

    public async Task<List<NearbyClienteDto>> GetNearbyClientesAsync(double lat, double lng, double radiusKm, int tenantId)
    {
        var radiusMeters = radiusKm * 1000;

        // Everything computed in PostgreSQL via PostGIS:
        // 1. ST_SetSRID + ST_MakePoint to create reference point
        // 2. ST_DWithin for fast index-backed radius filter (uses GIST index)
        // 3. ST_DistanceSphere for precise great-circle distance in meters
        // 4. ORDER BY distance — sorted in DB, not in memory
        var results = await _db.Database
            .SqlQueryRaw<NearbyClienteRow>(@"
                SELECT
                    c.id AS ""Id"",
                    c.nombre AS ""Nombre"",
                    ROUND(ST_DistanceSphere(c.ubicacion, ST_SetSRID(ST_MakePoint({1}, {0}), 4326))::numeric, 1) AS ""DistanciaMetros"",
                    uv.ultima_visita AS ""UltimaVisita"",
                    up.ultimo_pedido AS ""UltimoPedido"",
                    c.es_prospecto AS ""EsProspecto"",
                    c.latitud AS ""Latitud"",
                    c.longitud AS ""Longitud""
                FROM ""Clientes"" c
                LEFT JOIN LATERAL (
                    SELECT MAX(v.fecha_hora_inicio) AS ultima_visita
                    FROM ""ClienteVisitas"" v
                    WHERE v.cliente_id = c.id AND v.tenant_id = {2}
                      AND v.eliminado_en IS NULL
                ) uv ON true
                LEFT JOIN LATERAL (
                    SELECT MAX(p.fecha_pedido) AS ultimo_pedido
                    FROM ""Pedidos"" p
                    WHERE p.cliente_id = c.id AND p.tenant_id = {2}
                      AND p.eliminado_en IS NULL
                ) up ON true
                WHERE c.tenant_id = {2}
                  AND c.activo = true
                  AND c.eliminado_en IS NULL
                  AND c.ubicacion IS NOT NULL
                  AND ST_DWithin(
                      c.ubicacion::geography,
                      ST_SetSRID(ST_MakePoint({1}, {0}), 4326)::geography,
                      {3}
                  )
                ORDER BY ST_DistanceSphere(c.ubicacion, ST_SetSRID(ST_MakePoint({1}, {0}), 4326))",
                lat, lng, tenantId, radiusMeters)
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
        var cutoff = DateTime.UtcNow.AddDays(-daysSinceVisit);

        // Same PostGIS query but with unserved filter pushed into SQL
        var results = await _db.Database
            .SqlQueryRaw<NearbyClienteRow>(@"
                SELECT
                    c.id AS ""Id"",
                    c.nombre AS ""Nombre"",
                    ROUND(ST_DistanceSphere(c.ubicacion, ST_SetSRID(ST_MakePoint({1}, {0}), 4326))::numeric, 1) AS ""DistanciaMetros"",
                    uv.ultima_visita AS ""UltimaVisita"",
                    up.ultimo_pedido AS ""UltimoPedido"",
                    c.es_prospecto AS ""EsProspecto"",
                    c.latitud AS ""Latitud"",
                    c.longitud AS ""Longitud""
                FROM ""Clientes"" c
                LEFT JOIN LATERAL (
                    SELECT MAX(v.fecha_hora_inicio) AS ultima_visita
                    FROM ""ClienteVisitas"" v
                    WHERE v.cliente_id = c.id AND v.tenant_id = {2}
                      AND v.eliminado_en IS NULL
                ) uv ON true
                LEFT JOIN LATERAL (
                    SELECT MAX(p.fecha_pedido) AS ultimo_pedido
                    FROM ""Pedidos"" p
                    WHERE p.cliente_id = c.id AND p.tenant_id = {2}
                      AND p.eliminado_en IS NULL
                ) up ON true
                WHERE c.tenant_id = {2}
                  AND c.activo = true
                  AND c.eliminado_en IS NULL
                  AND c.ubicacion IS NOT NULL
                  AND c.es_prospecto = false
                  AND ST_DWithin(
                      c.ubicacion::geography,
                      ST_SetSRID(ST_MakePoint({1}, {0}), 4326)::geography,
                      {3}
                  )
                  AND (uv.ultima_visita IS NULL OR uv.ultima_visita < {4})
                ORDER BY ST_DistanceSphere(c.ubicacion, ST_SetSRID(ST_MakePoint({1}, {0}), 4326))",
                lat, lng, tenantId, radiusMeters, cutoff)
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

        // Same PostGIS query but filtered to prospects only
        var results = await _db.Database
            .SqlQueryRaw<NearbyClienteRow>(@"
                SELECT
                    c.id AS ""Id"",
                    c.nombre AS ""Nombre"",
                    ROUND(ST_DistanceSphere(c.ubicacion, ST_SetSRID(ST_MakePoint({1}, {0}), 4326))::numeric, 1) AS ""DistanciaMetros"",
                    uv.ultima_visita AS ""UltimaVisita"",
                    up.ultimo_pedido AS ""UltimoPedido"",
                    c.es_prospecto AS ""EsProspecto"",
                    c.latitud AS ""Latitud"",
                    c.longitud AS ""Longitud""
                FROM ""Clientes"" c
                LEFT JOIN LATERAL (
                    SELECT MAX(v.fecha_hora_inicio) AS ultima_visita
                    FROM ""ClienteVisitas"" v
                    WHERE v.cliente_id = c.id AND v.tenant_id = {2}
                      AND v.eliminado_en IS NULL
                ) uv ON true
                LEFT JOIN LATERAL (
                    SELECT MAX(p.fecha_pedido) AS ultimo_pedido
                    FROM ""Pedidos"" p
                    WHERE p.cliente_id = c.id AND p.tenant_id = {2}
                      AND p.eliminado_en IS NULL
                ) up ON true
                WHERE c.tenant_id = {2}
                  AND c.activo = true
                  AND c.eliminado_en IS NULL
                  AND c.ubicacion IS NOT NULL
                  AND c.es_prospecto = true
                  AND ST_DWithin(
                      c.ubicacion::geography,
                      ST_SetSRID(ST_MakePoint({1}, {0}), 4326)::geography,
                      {3}
                  )
                ORDER BY ST_DistanceSphere(c.ubicacion, ST_SetSRID(ST_MakePoint({1}, {0}), 4326))",
                lat, lng, tenantId, radiusMeters)
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
