using HandySales.Application.UnidadesMedida.DTOs;
using HandySales.Application.UnidadesMedida.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.UnidadesMedida.Repositories;

public class UnidadMedidaRepository : IUnidadMedidaRepository
{
    private readonly HandySalesDbContext _db;

    public UnidadMedidaRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<UnidadMedidaDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.UnidadesMedida
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId)
            .Select(u => new UnidadMedidaDto
            {
                Id = u.Id,
                Nombre = u.Nombre,
                Abreviatura = u.Abreviatura
            })
            .ToListAsync();
    }

    public async Task<UnidadMedidaDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.UnidadesMedida
            .AsNoTracking()
            .Where(u => u.Id == id && u.TenantId == tenantId)
            .Select(u => new UnidadMedidaDto
            {
                Id = u.Id,
                Nombre = u.Nombre,
                Abreviatura = u.Abreviatura
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(UnidadMedidaCreateDto dto, int tenantId)
    {
        var entity = new UnidadMedida
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Abreviatura = dto.Abreviatura,
            CreadoEn = DateTime.UtcNow
        };

        _db.UnidadesMedida.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, UnidadMedidaCreateDto dto, int tenantId)
    {
        var entity = await _db.UnidadesMedida
            .FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId);

        if (entity == null) return false;

        entity.Nombre = dto.Nombre;
        entity.Abreviatura = dto.Abreviatura;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var entity = await _db.UnidadesMedida
            .FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId);

        if (entity == null) return false;

        _db.UnidadesMedida.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> ContarProductosPorUnidadAsync(int unidadId, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .CountAsync(p => p.UnidadMedidaId == unidadId && p.TenantId == tenantId);
    }

    public async Task<int> ContarProductosActivosPorUnidadAsync(int unidadId, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .CountAsync(p => p.UnidadMedidaId == unidadId && p.TenantId == tenantId && p.Activo);
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.UnidadesMedida
            .FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.UnidadesMedida
            .Where(u => ids.Contains(u.Id) && u.TenantId == tenantId)
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
        var query = _db.UnidadesMedida
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId && u.Nombre.ToLower() == nombre.ToLower());

        if (excludeId.HasValue)
            query = query.Where(u => u.Id != excludeId.Value);

        return await query.AnyAsync();
    }
}
