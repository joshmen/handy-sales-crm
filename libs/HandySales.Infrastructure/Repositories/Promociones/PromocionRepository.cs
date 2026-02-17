using HandySales.Application.Promociones.DTOs;
using HandySales.Application.Promociones.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Promociones.Repositories;

public class PromocionRepository : IPromocionRepository
{
    private readonly HandySalesDbContext _db;

    public PromocionRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<PromocionDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.Promociones
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId)
            .Select(p => new PromocionDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Descripcion = p.Descripcion,
                DescuentoPorcentaje = p.DescuentoPorcentaje,
                FechaInicio = p.FechaInicio,
                FechaFin = p.FechaFin,
                Activo = p.Activo,
                Productos = p.PromocionProductos.Select(pp => new PromocionProductoInfo
                {
                    ProductoId = pp.ProductoId,
                    ProductoNombre = pp.Producto.Nombre,
                    ProductoCodigo = pp.Producto.CodigoBarra
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<PromocionDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Promociones
            .AsNoTracking()
            .Where(p => p.Id == id && p.TenantId == tenantId)
            .Select(p => new PromocionDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Descripcion = p.Descripcion,
                DescuentoPorcentaje = p.DescuentoPorcentaje,
                FechaInicio = p.FechaInicio,
                FechaFin = p.FechaFin,
                Activo = p.Activo,
                Productos = p.PromocionProductos.Select(pp => new PromocionProductoInfo
                {
                    ProductoId = pp.ProductoId,
                    ProductoNombre = pp.Producto.Nombre,
                    ProductoCodigo = pp.Producto.CodigoBarra
                }).ToList()
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(PromocionCreateDto dto, int tenantId)
    {
        var entity = new Promocion
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            Descripcion = dto.Descripcion,
            DescuentoPorcentaje = dto.DescuentoPorcentaje,
            FechaInicio = dto.FechaInicio,
            FechaFin = dto.FechaFin,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };

        _db.Promociones.Add(entity);
        await _db.SaveChangesAsync();

        // Crear registros en la tabla junction
        foreach (var productoId in dto.ProductoIds)
        {
            _db.PromocionProductos.Add(new PromocionProducto
            {
                TenantId = tenantId,
                PromocionId = entity.Id,
                ProductoId = productoId
            });
        }

        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, PromocionCreateDto dto, int tenantId)
    {
        var entity = await _db.Promociones
            .Include(p => p.PromocionProductos)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        entity.Nombre = dto.Nombre;
        entity.Descripcion = dto.Descripcion;
        entity.DescuentoPorcentaje = dto.DescuentoPorcentaje;
        entity.FechaInicio = dto.FechaInicio;
        entity.FechaFin = dto.FechaFin;
        entity.ActualizadoEn = DateTime.UtcNow;

        // Reemplazar productos: quitar los existentes y agregar los nuevos
        _db.PromocionProductos.RemoveRange(entity.PromocionProductos);

        foreach (var productoId in dto.ProductoIds)
        {
            _db.PromocionProductos.Add(new PromocionProducto
            {
                TenantId = tenantId,
                PromocionId = entity.Id,
                ProductoId = productoId
            });
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var entity = await _db.Promociones
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        _db.Promociones.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.Promociones
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.Promociones
            .Where(p => ids.Contains(p.Id) && p.TenantId == tenantId)
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
        var query = _db.Promociones
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Nombre == nombre);

        if (excludeId.HasValue)
            query = query.Where(p => p.Id != excludeId.Value);

        return await query.AnyAsync();
    }

    public async Task<List<PromocionDto>> ObtenerPromocionesConProductoAsync(int productoId, int tenantId, int? excludeId = null)
    {
        var query = _db.Promociones
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo && p.PromocionProductos.Any(pp => pp.ProductoId == productoId));

        if (excludeId.HasValue)
            query = query.Where(p => p.Id != excludeId.Value);

        return await query
            .Select(p => new PromocionDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                Descripcion = p.Descripcion,
                DescuentoPorcentaje = p.DescuentoPorcentaje,
                FechaInicio = p.FechaInicio,
                FechaFin = p.FechaFin,
                Activo = p.Activo,
                Productos = p.PromocionProductos.Select(pp => new PromocionProductoInfo
                {
                    ProductoId = pp.ProductoId,
                    ProductoNombre = pp.Producto.Nombre,
                    ProductoCodigo = pp.Producto.CodigoBarra
                }).ToList()
            })
            .ToListAsync();
    }
}
