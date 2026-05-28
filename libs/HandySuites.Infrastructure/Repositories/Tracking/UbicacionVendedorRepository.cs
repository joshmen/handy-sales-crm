using HandySuites.Application.Tracking.DTOs;
using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Tracking;

public class UbicacionVendedorRepository : IUbicacionVendedorRepository
{
    private readonly HandySuitesDbContext _db;

    public UbicacionVendedorRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<(int Inserted, int Skipped)> InsertBatchAsync(int tenantId, IEnumerable<UbicacionVendedor> pings)
    {
        var pingList = pings.ToList();
        if (pingList.Count == 0) return (0, 0);

        // Dedup por (UsuarioId, CapturadoEn) consultando los timestamps que ya
        // existen para el batch. Más simple que ON CONFLICT (necesitaría unique
        // index dedicado y EF no lo soporta cleanly con SaveChanges).
        var keys = pingList
            .Select(p => new { p.UsuarioId, p.CapturadoEn })
            .Distinct()
            .ToList();

        var usuarioIds = keys.Select(k => k.UsuarioId).Distinct().ToList();
        var minTime = keys.Min(k => k.CapturadoEn);
        var maxTime = keys.Max(k => k.CapturadoEn);

        var existentes = await _db.UbicacionesVendedor.AsNoTracking()
            .Where(u => u.TenantId == tenantId
                        && usuarioIds.Contains(u.UsuarioId)
                        && u.CapturadoEn >= minTime
                        && u.CapturadoEn <= maxTime)
            .Select(u => new { u.UsuarioId, u.CapturadoEn })
            .ToListAsync();

        var existKey = new HashSet<(int, DateTime)>(existentes.Select(e => (e.UsuarioId, e.CapturadoEn)));
        var nuevos = pingList.Where(p => !existKey.Contains((p.UsuarioId, p.CapturadoEn))).ToList();

        if (nuevos.Count > 0)
        {
            _db.UbicacionesVendedor.AddRange(nuevos);
            await _db.SaveChangesAsync();
        }

        return (nuevos.Count, pingList.Count - nuevos.Count);
    }

    public async Task<List<UltimaUbicacionDto>> ObtenerUltimasAsync(int tenantId, List<int>? usuarioIds = null)
    {
        // Postgres DISTINCT ON: para cada usuario, traer el ping más reciente.
        // EF no traduce GroupBy.First() nativamente — usamos SQL raw con DISTINCT ON
        // que es la forma idiomática y eficiente en Postgres (1 index seek por grupo).
        var sql = usuarioIds != null && usuarioIds.Count > 0
            ? @"
                SELECT DISTINCT ON (usuario_id)
                    usuario_id, latitud, longitud, tipo, capturado_en
                FROM ""UbicacionesVendedor""
                WHERE tenant_id = {0} AND eliminado_en IS NULL AND usuario_id = ANY({1})
                ORDER BY usuario_id, capturado_en DESC"
            : @"
                SELECT DISTINCT ON (usuario_id)
                    usuario_id, latitud, longitud, tipo, capturado_en
                FROM ""UbicacionesVendedor""
                WHERE tenant_id = {0} AND eliminado_en IS NULL
                ORDER BY usuario_id, capturado_en DESC";

        var rows = usuarioIds != null && usuarioIds.Count > 0
            ? await _db.Database.SqlQueryRaw<UltimaUbicacionRaw>(sql, tenantId, usuarioIds.ToArray()).ToListAsync()
            : await _db.Database.SqlQueryRaw<UltimaUbicacionRaw>(sql, tenantId).ToListAsync();

        return rows.Select(r => new UltimaUbicacionDto
        {
            UsuarioId = r.usuario_id,
            Latitud = r.latitud,
            Longitud = r.longitud,
            Tipo = (HandySuites.Domain.Common.TipoPingUbicacion)r.tipo,
            CapturadoEn = r.capturado_en,
        }).ToList();
    }

    // Postgres SqlQueryRaw requiere POCO con propiedades exactamente igual al column alias.
    // Mapeo a UltimaUbicacionDto se hace en C# después del query.
    private record UltimaUbicacionRaw(int usuario_id, decimal latitud, decimal longitud, int tipo, DateTime capturado_en);

    public async Task<bool> ExisteSessionAbiertaAsync(int tenantId, int usuarioId,
        TipoPingUbicacion startTipo, TipoPingUbicacion endTipo,
        DateOnly diaServicio, DateTime beforeCapturadoEn)
    {
        // Una sesión está "abierta" si existe un start anterior a beforeCapturadoEn
        // que no tenga un end entre ambos timestamps. Esto rechaza pings
        // duplicados de InicioRuta/InicioJornada cuando el vendedor ya tiene
        // una sesión activa que no fue cerrada (escenario que causaba que
        // pings #88 y #89 InicioRuta apareciesen 6min apart en prod
        // 2026-05-26 — Rodrigo).
        var startInt = (int)startTipo;
        var endInt = (int)endTipo;
        return await _db.UbicacionesVendedor.AsNoTracking()
            .Where(u => u.TenantId == tenantId
                     && u.UsuarioId == usuarioId
                     && u.DiaServicio == diaServicio
                     && (int)u.Tipo == startInt
                     && u.CapturadoEn < beforeCapturadoEn)
            .AnyAsync(u => !_db.UbicacionesVendedor.AsNoTracking().Any(u2 =>
                u2.TenantId == u.TenantId
                && u2.UsuarioId == u.UsuarioId
                && (int)u2.Tipo == endInt
                && u2.CapturadoEn > u.CapturadoEn
                && u2.CapturadoEn <= beforeCapturadoEn));
    }

    public Task<List<UbicacionVendedorDto>> ObtenerRecorridoEntreAsync(
        int tenantId, int usuarioId, DateTime inicioUtc, DateTime finUtc)
    {
        return _db.UbicacionesVendedor.AsNoTracking()
            .Where(u => u.TenantId == tenantId
                     && u.UsuarioId == usuarioId
                     && u.CapturadoEn >= inicioUtc
                     && u.CapturadoEn < finUtc)
            .OrderBy(u => u.CapturadoEn)
            .Select(u => new UbicacionVendedorDto
            {
                Id = u.Id,
                UsuarioId = u.UsuarioId,
                Latitud = u.Latitud,
                Longitud = u.Longitud,
                PrecisionMetros = u.PrecisionMetros,
                Tipo = u.Tipo,
                CapturadoEn = u.CapturadoEn,
                ReferenciaId = u.ReferenciaId,
            })
            .ToListAsync();
    }
}
