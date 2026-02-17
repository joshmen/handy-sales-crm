using HandySales.Application.Zonas.DTOs;
using HandySales.Application.Zonas.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Zonas.Repositories;

public class ZonaRepository : IZonaRepository
{
    private readonly HandySalesDbContext _db;

    public ZonaRepository(HandySalesDbContext db)
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
                ClientesActivos = _db.Clientes.Count(c => c.IdZona == z.Id && c.TenantId == tenantId && c.Activo)
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
                ClientesActivos = _db.Clientes.Count(c => c.IdZona == z.Id && c.TenantId == tenantId && c.Activo)
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
}
