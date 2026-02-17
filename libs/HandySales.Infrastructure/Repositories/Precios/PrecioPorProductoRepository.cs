using HandySales.Application.Precios.DTOs;
using HandySales.Application.Precios.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Precios.Repositories;

public class PrecioPorProductoRepository : IPrecioPorProductoRepository
{
    private readonly HandySalesDbContext _db;

    public PrecioPorProductoRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<PrecioPorProductoDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.PreciosPorProducto
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId)
            .Select(p => new PrecioPorProductoDto
            {
                Id = p.Id,
                ProductoId = p.ProductoId,
                ListaPrecioId = p.ListaPrecioId,
                Precio = p.Precio
            })
            .ToListAsync();
    }

    public async Task<PrecioPorProductoDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.PreciosPorProducto
            .AsNoTracking()
            .Where(p => p.Id == id && p.TenantId == tenantId)
            .Select(p => new PrecioPorProductoDto
            {
                Id = p.Id,
                ProductoId = p.ProductoId,
                ListaPrecioId = p.ListaPrecioId,
                Precio = p.Precio
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<PrecioPorProductoDto>> ObtenerPorListaAsync(int listaPrecioId, int tenantId)
    {
        return await _db.PreciosPorProducto
            .AsNoTracking()
            .Where(p => p.ListaPrecioId == listaPrecioId && p.TenantId == tenantId)
            .Select(p => new PrecioPorProductoDto
            {
                Id = p.Id,
                ProductoId = p.ProductoId,
                ListaPrecioId = p.ListaPrecioId,
                Precio = p.Precio
            })
            .ToListAsync();
    }

    public async Task<int> CrearAsync(PrecioPorProductoCreateDto dto, int tenantId)
    {
        var entity = new PrecioPorProducto
        {
            TenantId = tenantId,
            ProductoId = dto.ProductoId,
            ListaPrecioId = dto.ListaPrecioId,
            Precio = dto.Precio,
            CreadoEn = DateTime.UtcNow,
            Activo = true
        };

        _db.PreciosPorProducto.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, PrecioPorProductoCreateDto dto, int tenantId)
    {
        var entity = await _db.PreciosPorProducto
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        entity.ProductoId = dto.ProductoId;
        entity.ListaPrecioId = dto.ListaPrecioId;
        entity.Precio = dto.Precio;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var entity = await _db.PreciosPorProducto
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        _db.PreciosPorProducto.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }
}
