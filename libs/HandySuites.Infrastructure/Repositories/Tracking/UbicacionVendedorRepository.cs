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

        // Dedup intra-batch primero — si el mismo batch trae duplicates,
        // los quitamos antes de mandar al DB para evitar conflict consigo mismo.
        // Mantiene el primer ping con cada key (orden de entrada).
        var deduped = pingList
            .GroupBy(p => (p.UsuarioId, p.CapturadoEn))
            .Select(g => g.First())
            .ToList();
        var intraBatchSkipped = pingList.Count - deduped.Count;

        // 2026-06-08 (fix GPS spam): INSERT ... ON CONFLICT DO NOTHING contra el
        // UNIQUE INDEX (tenant_id, usuario_id, capturado_en). Elimina la race
        // window del query-then-insert anterior — DB es source-of-truth dedup.
        // RETURNING id cuenta cuantos rows fueron realmente insertados (no
        // conflictivos). Los que conflicten se ignoran silenciosamente.
        var sql = @"
INSERT INTO ""UbicacionesVendedor"" (
    tenant_id, usuario_id, latitud, longitud, precision_metros,
    tipo, capturado_en, referencia_id, dia_servicio, activo,
    creado_en, actualizado_en, creado_por, actualizado_por,
    eliminado_en, eliminado_por, version
) VALUES (
    @tenant_id, @usuario_id, @latitud, @longitud, @precision_metros,
    @tipo, @capturado_en, @referencia_id, @dia_servicio, @activo,
    @creado_en, NULL, @creado_por, NULL, NULL, NULL, 1
)
ON CONFLICT (tenant_id, usuario_id, capturado_en) DO NOTHING
RETURNING id;
";
        var inserted = 0;
        await using var conn = (Npgsql.NpgsqlConnection)_db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();
        foreach (var p in deduped)
        {
            await using var cmd = new Npgsql.NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@tenant_id", p.TenantId);
            cmd.Parameters.AddWithValue("@usuario_id", p.UsuarioId);
            cmd.Parameters.AddWithValue("@latitud", p.Latitud);
            cmd.Parameters.AddWithValue("@longitud", p.Longitud);
            cmd.Parameters.AddWithValue("@precision_metros", (object?)p.PrecisionMetros ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@tipo", (int)p.Tipo);
            cmd.Parameters.AddWithValue("@capturado_en", p.CapturadoEn);
            cmd.Parameters.AddWithValue("@referencia_id", (object?)p.ReferenciaId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@dia_servicio", p.DiaServicio);
            cmd.Parameters.AddWithValue("@activo", p.Activo);
            cmd.Parameters.AddWithValue("@creado_en", p.CreadoEn);
            cmd.Parameters.AddWithValue("@creado_por", (object?)p.CreadoPor ?? DBNull.Value);
            var result = await cmd.ExecuteScalarAsync();
            if (result != null && result != DBNull.Value)
            {
                inserted++;
            }
        }

        var skipped = intraBatchSkipped + (deduped.Count - inserted);
        return (inserted, skipped);
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
