using HandySales.Application.CategoriasProductos.DTOs;
using HandySales.Application.CategoriasProductos.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.CategoriasProductos.Repositories;

public class CategoriaProductoRepository : ICategoriaProductoRepository
{
    private readonly HandySalesDbContext _db;

    public CategoriaProductoRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<CategoriaProductoDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.CategoriasProductos
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .Select(c => new CategoriaProductoDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Descripcion = c.Descripcion
            })
            .ToListAsync();
    }

    public async Task<CategoriaProductoDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.CategoriasProductos
            .AsNoTracking()
            .Where(c => c.Id == id && c.TenantId == tenantId)
            .Select(c => new CategoriaProductoDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Descripcion = c.Descripcion
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(CategoriaProductoCreateDto dto, int tenantId)
    {
        var entity = new CategoriaProducto
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            CreadoEn = DateTime.UtcNow
        };

        _db.CategoriasProductos.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, CategoriaProductoCreateDto dto, int tenantId)
    {
        var entity = await _db.CategoriasProductos
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        entity.Nombre = dto.Nombre;
        entity.Descripcion = dto.Descripcion;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var entity = await _db.CategoriasProductos
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        _db.CategoriasProductos.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> ContarProductosPorCategoriaAsync(int categoriaId, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .CountAsync(p => p.CategoraId == categoriaId && p.TenantId == tenantId);
    }

    public async Task<int> ContarProductosActivosPorCategoriaAsync(int categoriaId, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .CountAsync(p => p.CategoraId == categoriaId && p.TenantId == tenantId && p.Activo);
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.CategoriasProductos
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.CategoriasProductos
            .Where(c => ids.Contains(c.Id) && c.TenantId == tenantId)
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
        var query = _db.CategoriasProductos
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Nombre.ToLower() == nombre.ToLower());

        if (excludeId.HasValue)
            query = query.Where(c => c.Id != excludeId.Value);

        return await query.AnyAsync();
    }
}
