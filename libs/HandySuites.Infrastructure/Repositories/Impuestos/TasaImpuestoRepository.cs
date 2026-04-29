using HandySuites.Application.Impuestos.DTOs;
using HandySuites.Application.Impuestos.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Impuestos;

public class TasaImpuestoRepository : ITasaImpuestoRepository
{
    private readonly HandySuitesDbContext _db;

    public TasaImpuestoRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<TasaImpuestoDto>> ObtenerTodasAsync(int tenantId, bool incluirInactivas = false)
    {
        var query = _db.TasasImpuesto
            .AsNoTracking()
            .Where(t => t.TenantId == tenantId);
        if (!incluirInactivas)
            query = query.Where(t => t.Activo);

        return await query
            .OrderByDescending(t => t.EsDefault)
            .ThenBy(t => t.Nombre)
            .Select(t => new TasaImpuestoDto
            {
                Id = t.Id,
                TenantId = t.TenantId,
                Nombre = t.Nombre,
                Tasa = t.Tasa,
                ClaveSat = t.ClaveSat,
                TipoImpuesto = t.TipoImpuesto,
                EsDefault = t.EsDefault,
                Activo = t.Activo,
                ProductosCount = _db.Productos.Count(p => p.TasaImpuestoId == t.Id)
            })
            .ToListAsync();
    }

    public async Task<TasaImpuestoDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.TasasImpuesto
            .AsNoTracking()
            .Where(t => t.Id == id && t.TenantId == tenantId)
            .Select(t => new TasaImpuestoDto
            {
                Id = t.Id,
                TenantId = t.TenantId,
                Nombre = t.Nombre,
                Tasa = t.Tasa,
                ClaveSat = t.ClaveSat,
                TipoImpuesto = t.TipoImpuesto,
                EsDefault = t.EsDefault,
                Activo = t.Activo,
                ProductosCount = _db.Productos.Count(p => p.TasaImpuestoId == t.Id)
            })
            .FirstOrDefaultAsync();
    }

    public Task<TasaImpuesto?> ObtenerEntidadAsync(int id, int tenantId)
        => _db.TasasImpuesto.FirstOrDefaultAsync(t => t.Id == id && t.TenantId == tenantId);

    public Task<TasaImpuesto?> ObtenerDefaultAsync(int tenantId)
        => _db.TasasImpuesto
            .AsNoTracking()
            .Where(t => t.TenantId == tenantId && t.EsDefault && t.Activo)
            .FirstOrDefaultAsync();

    public async Task<int> CrearAsync(TasaImpuesto tasa)
    {
        _db.TasasImpuesto.Add(tasa);
        await _db.SaveChangesAsync();
        return tasa.Id;
    }

    public async Task<bool> ActualizarAsync(TasaImpuesto tasa)
    {
        _db.TasasImpuesto.Update(tasa);
        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var tasa = await _db.TasasImpuesto.FirstOrDefaultAsync(t => t.Id == id && t.TenantId == tenantId);
        if (tasa is null) return false;
        // Soft delete via Activo=false. SaveChangesAsync override convierte a EliminadoEn
        // cuando se llama Remove(). Aquí preferimos soft via Activo para no romper FKs:
        // Productos.TasaImpuestoId queda apuntando a la tasa pero el queryFilter
        // filtra inactivas en lookups normales — el helper CalculateLineAmounts resuelve
        // a la tasa default si la tasa del producto no está activa.
        _db.TasasImpuesto.Remove(tasa);
        return await _db.SaveChangesAsync() > 0;
    }

    public async Task UnsetDefaultExceptAsync(int tenantId, int exceptTasaId)
    {
        var others = await _db.TasasImpuesto
            .Where(t => t.TenantId == tenantId && t.EsDefault && t.Id != exceptTasaId)
            .ToListAsync();
        if (others.Count == 0) return;
        foreach (var t in others) t.EsDefault = false;
        await _db.SaveChangesAsync();
    }
}
