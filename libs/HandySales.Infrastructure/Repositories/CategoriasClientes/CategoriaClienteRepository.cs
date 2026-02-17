using HandySales.Application.CategoriasClientes.DTOs;
using HandySales.Application.CategoriasClientes.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.CategoriasClientes.Repositories;

public class CategoriaClienteRepository : ICategoriaClienteRepository
{
    private readonly HandySalesDbContext _db;

    public CategoriaClienteRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<CategoriaClienteDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.CategoriasClientes
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId)
            .Select(c => new CategoriaClienteDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Descripcion = c.Descripcion
            })
            .ToListAsync();
    }

    public async Task<CategoriaClienteDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.CategoriasClientes
            .AsNoTracking()
            .Where(c => c.Id == id && c.TenantId == tenantId)
            .Select(c => new CategoriaClienteDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Descripcion = c.Descripcion
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(CategoriaClienteCreateDto dto, int tenantId)
    {
        var entity = new CategoriaCliente
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            CreadoEn = DateTime.UtcNow
        };

        _db.CategoriasClientes.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, CategoriaClienteCreateDto dto, int tenantId)
    {
        var entity = await _db.CategoriasClientes
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
        var entity = await _db.CategoriasClientes
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        _db.CategoriasClientes.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> ContarClientesPorCategoriaAsync(int categoriaId, int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .CountAsync(c => c.CategoriaClienteId == categoriaId && c.TenantId == tenantId);
    }

    public async Task<int> ContarClientesActivosPorCategoriaAsync(int categoriaId, int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .CountAsync(c => c.CategoriaClienteId == categoriaId && c.TenantId == tenantId && c.Activo);
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.CategoriasClientes
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.CategoriasClientes
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
}
