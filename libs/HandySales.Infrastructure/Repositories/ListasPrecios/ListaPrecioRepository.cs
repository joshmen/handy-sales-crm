using HandySales.Application.ListasPrecios.DTOs;
using HandySales.Application.ListasPrecios.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.ListasPrecios.Repositories;

public class ListaPrecioRepository : IListaPrecioRepository
{
    private readonly HandySalesDbContext _db;

    public ListaPrecioRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<ListaPrecioDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.ListasPrecios
            .AsNoTracking()
            .Where(l => l.TenantId == tenantId)
            .Select(l => new ListaPrecioDto
            {
                Id = l.Id,
                Nombre = l.Nombre,
                Descripcion = l.Descripcion,
                Activo = l.Activo,
                CreadoEn = l.CreadoEn,
                ActualizadoEn = l.ActualizadoEn
            })
            .ToListAsync();
    }

    public async Task<ListaPrecioDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.ListasPrecios
            .AsNoTracking()
            .Where(l => l.Id == id && l.TenantId == tenantId)
            .Select(l => new ListaPrecioDto
            {
                Id = l.Id,
                Nombre = l.Nombre,
                Descripcion = l.Descripcion,
                Activo = l.Activo,
                CreadoEn = l.CreadoEn,
                ActualizadoEn = l.ActualizadoEn
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(ListaPrecioCreateDto dto, int tenantId)
    {
        var entity = new ListaPrecio
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            CreadoEn = DateTime.UtcNow,
            Activo = true
        };

        _db.ListasPrecios.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, ListaPrecioCreateDto dto, int tenantId)
    {
        var entity = await _db.ListasPrecios
            .FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenantId);

        if (entity == null) return false;

        entity.Nombre = dto.Nombre;
        entity.Descripcion = dto.Descripcion;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var entity = await _db.ListasPrecios
            .FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenantId);

        if (entity == null) return false;

        _db.ListasPrecios.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> ContarPreciosActivosPorListaAsync(int listaPrecioId, int tenantId)
    {
        return await _db.PreciosPorProducto
            .AsNoTracking()
            .CountAsync(p => p.ListaPrecioId == listaPrecioId && p.TenantId == tenantId && p.Activo);
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.ListasPrecios
            .FirstOrDefaultAsync(l => l.Id == id && l.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.ListasPrecios
            .Where(l => ids.Contains(l.Id) && l.TenantId == tenantId)
            .ToListAsync();

        foreach (var entity in entities)
        {
            entity.Activo = activo;
            entity.ActualizadoEn = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return entities.Count;
    }

    public async Task<bool> ExisteNombreAsync(string nombre, int tenantId, int? excludeId = null)
    {
        var query = _db.ListasPrecios
            .AsNoTracking()
            .Where(l => l.TenantId == tenantId && l.Nombre.ToLower() == nombre.ToLower());

        if (excludeId.HasValue)
            query = query.Where(l => l.Id != excludeId.Value);

        return await query.AnyAsync();
    }
}
