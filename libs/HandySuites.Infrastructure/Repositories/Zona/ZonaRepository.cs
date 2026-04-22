using HandySuites.Application.Zonas.DTOs;
using HandySuites.Application.Zonas.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Zonas.Repositories;

public class ZonaRepository : IZonaRepository
{
    private readonly HandySuitesDbContext _db;

    public ZonaRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<ZonaDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.Zonas
            .AsNoTracking()
            .Where(z => z.TenantId == tenantId)
            .Select(z => new ZonaDto
            {
                Id = z.Id,
                Nombre = z.Nombre,
                Descripcion = z.Descripcion,
                Activo = z.Activo,
                ClientesActivos = _db.Clientes.Count(c => c.IdZona == z.Id && c.TenantId == tenantId && c.Activo),
                CentroLatitud = z.CentroLatitud,
                CentroLongitud = z.CentroLongitud,
                RadioKm = z.RadioKm
            })
            .ToListAsync();
    }

    public async Task<ZonaDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Zonas
            .AsNoTracking()
            .Where(z => z.Id == id && z.TenantId == tenantId)
            .Select(z => new ZonaDto
            {
                Id = z.Id,
                Nombre = z.Nombre,
                Descripcion = z.Descripcion,
                Activo = z.Activo,
                ClientesActivos = _db.Clientes.Count(c => c.IdZona == z.Id && c.TenantId == tenantId && c.Activo),
                CentroLatitud = z.CentroLatitud,
                CentroLongitud = z.CentroLongitud,
                RadioKm = z.RadioKm
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(CreateZonaDto dto, string creadoPor, int tenantId)
    {
        var nueva = new Zona
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            CentroLatitud = dto.CentroLatitud,
            CentroLongitud = dto.CentroLongitud,
            RadioKm = dto.RadioKm,
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = creadoPor
        };

        _db.Zonas.Add(nueva);
        await _db.SaveChangesAsync();
        return nueva.Id;
    }

    public async Task<bool> ActualizarAsync(int id, UpdateZonaDto dto, string actualizadoPor, int tenantId)
    {
        var zona = await _db.Zonas
            .FirstOrDefaultAsync(z => z.Id == id && z.TenantId == tenantId);

        if (zona == null) return false;

        zona.Nombre = dto.Nombre;
        zona.Descripcion = dto.Descripcion;
        zona.Activo = dto.Activo;
        zona.CentroLatitud = dto.CentroLatitud;
        zona.CentroLongitud = dto.CentroLongitud;
        zona.RadioKm = dto.RadioKm;
        zona.ActualizadoEn = DateTime.UtcNow;
        zona.ActualizadoPor = actualizadoPor;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var zona = await _db.Zonas
            .FirstOrDefaultAsync(z => z.Id == id && z.TenantId == tenantId);

        if (zona == null) return false;

        _db.Zonas.Remove(zona);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> ContarClientesPorZonaAsync(int zonaId, int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .CountAsync(c => c.IdZona == zonaId && c.TenantId == tenantId);
    }

    public async Task<int> ContarClientesActivosPorZonaAsync(int zonaId, int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .CountAsync(c => c.IdZona == zonaId && c.TenantId == tenantId && c.Activo);
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.Zonas
            .FirstOrDefaultAsync(z => z.Id == id && z.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.Zonas
            .Where(z => ids.Contains(z.Id) && z.TenantId == tenantId)
            .ToListAsync();

        foreach (var entity in entities)
        {
            entity.Activo = activo;
            entity.ActualizadoEn = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return entities.Count;
    }

    public async Task<List<(int Id, string Nombre, double Lat, double Lng, double RadioKm)>> ObtenerZonasConCoordenadasAsync(int tenantId, int? excludeId = null)
    {
        var query = _db.Zonas
            .AsNoTracking()
            .Where(z => z.TenantId == tenantId
                && z.CentroLatitud.HasValue
                && z.CentroLongitud.HasValue
                && z.RadioKm.HasValue);

        if (excludeId.HasValue)
            query = query.Where(z => z.Id != excludeId.Value);

        var items = await query
            .Select(z => new { z.Id, z.Nombre, Lat = z.CentroLatitud!.Value, Lng = z.CentroLongitud!.Value, Radio = z.RadioKm!.Value })
            .ToListAsync();

        return items.Select(z => (z.Id, z.Nombre, z.Lat, z.Lng, z.Radio)).ToList();
    }

    public Task<bool> ExisteNombreEnTenantAsync(string nombre, int tenantId, int? excludeId = null)
    {
        var query = _db.Zonas.AsNoTracking()
            .Where(z => z.TenantId == tenantId && z.Nombre.ToLower() == nombre.ToLower());
        if (excludeId.HasValue)
            query = query.Where(z => z.Id != excludeId.Value);
        return query.AnyAsync();
    }
}
