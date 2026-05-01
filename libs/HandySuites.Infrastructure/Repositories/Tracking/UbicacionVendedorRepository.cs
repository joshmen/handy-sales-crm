using HandySuites.Application.Tracking.DTOs;
using HandySuites.Application.Tracking.Interfaces;
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
        // EF no traduce DISTINCT ON nativamente — usamos GroupBy + agregado.
        var query = _db.UbicacionesVendedor.AsNoTracking()
            .Where(u => u.TenantId == tenantId);
        if (usuarioIds != null && usuarioIds.Count > 0)
            query = query.Where(u => usuarioIds.Contains(u.UsuarioId));

        return await query
            .GroupBy(u => u.UsuarioId)
            .Select(g => g.OrderByDescending(u => u.CapturadoEn).First())
            .Select(u => new UltimaUbicacionDto
            {
                UsuarioId = u.UsuarioId,
                Latitud = u.Latitud,
                Longitud = u.Longitud,
                Tipo = u.Tipo,
                CapturadoEn = u.CapturadoEn,
            })
            .ToListAsync();
    }

    public Task<List<UbicacionVendedorDto>> ObtenerRecorridoDelDiaAsync(int tenantId, int usuarioId, DateOnly dia)
    {
        return _db.UbicacionesVendedor.AsNoTracking()
            .Where(u => u.TenantId == tenantId && u.UsuarioId == usuarioId && u.DiaServicio == dia)
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
