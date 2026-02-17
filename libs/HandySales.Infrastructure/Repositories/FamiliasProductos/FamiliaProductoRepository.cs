using HandySales.Application.FamiliasProductos.DTOs;
using HandySales.Application.FamiliasProductos.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.FamiliasProductos.Repositories;

public class FamiliaProductoRepository : IFamiliaProductoRepository
{
    private readonly HandySalesDbContext _db;

    public FamiliaProductoRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<FamiliaProductoDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.FamiliasProductos
            .AsNoTracking()
            .Where(f => f.TenantId == tenantId)
            .OrderByDescending(f => f.CreadoEn)
            .Select(f => new FamiliaProductoDto
            {
                Id = f.Id,
                Nombre = f.Nombre,
                Descripcion = f.Descripcion,
                Activo = f.Activo
            })
            .ToListAsync();
    }

    public async Task<FamiliaProductoDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.FamiliasProductos
            .AsNoTracking()
            .Where(f => f.Id == id && f.TenantId == tenantId)
            .Select(f => new FamiliaProductoDto
            {
                Id = f.Id,
                Nombre = f.Nombre,
                Descripcion = f.Descripcion,
                Activo = f.Activo
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(FamiliaProductoCreateDto dto, int tenantId)
    {
        var nueva = new FamiliaProducto
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };

        _db.FamiliasProductos.Add(nueva);
        await _db.SaveChangesAsync();
        return nueva.Id;
    }

    public async Task<bool> ActualizarAsync(int id, FamiliaProductoCreateDto dto, int tenantId)
    {
        var familia = await _db.FamiliasProductos
            .FirstOrDefaultAsync(f => f.Id == id && f.TenantId == tenantId);

        if (familia == null) return false;

        familia.Nombre = dto.Nombre;
        familia.Descripcion = dto.Descripcion;
        familia.Activo = true;
        familia.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var familia = await _db.FamiliasProductos
            .FirstOrDefaultAsync(f => f.Id == id && f.TenantId == tenantId);

        if (familia == null) return false;

        _db.FamiliasProductos.Remove(familia);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> ContarProductosPorFamiliaAsync(int familiaId, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .CountAsync(p => p.FamiliaId == familiaId && p.TenantId == tenantId);
    }

    public async Task<int> ContarProductosActivosPorFamiliaAsync(int familiaId, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .CountAsync(p => p.FamiliaId == familiaId && p.TenantId == tenantId && p.Activo);
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.FamiliasProductos
            .FirstOrDefaultAsync(f => f.Id == id && f.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.FamiliasProductos
            .Where(f => ids.Contains(f.Id) && f.TenantId == tenantId)
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
        var query = _db.FamiliasProductos
            .AsNoTracking()
            .Where(f => f.TenantId == tenantId && f.Nombre.ToLower() == nombre.ToLower());

        if (excludeId.HasValue)
            query = query.Where(f => f.Id != excludeId.Value);

        return await query.AnyAsync();
    }
}
