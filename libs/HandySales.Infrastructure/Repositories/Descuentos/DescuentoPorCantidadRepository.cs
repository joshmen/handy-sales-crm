using HandySales.Application.Descuentos.DTOs;
using HandySales.Application.Descuentos.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Descuentos.Repositories;

public class DescuentoPorCantidadRepository : IDescuentoPorCantidadRepository
{
    private readonly HandySalesDbContext _db;

    public DescuentoPorCantidadRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<DescuentoPorCantidadDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.DescuentosPorCantidad
            .Include(d => d.Producto)
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId)
            .OrderByDescending(d => d.CreadoEn)
            .Select(d => new DescuentoPorCantidadDto
            {
                Id = d.Id,
                ProductoId = d.ProductoId,
                ProductoNombre = d.Producto != null ? d.Producto.Nombre : null,
                ProductoCodigo = d.Producto != null ? d.Producto.CodigoBarra : null,
                CantidadMinima = d.CantidadMinima,
                DescuentoPorcentaje = d.DescuentoPorcentaje,
                TipoAplicacion = d.TipoAplicacion,
                Activo = d.Activo,
                CreadoEn = d.CreadoEn,
                CreadoPor = d.CreadoPor,
                ActualizadoEn = d.ActualizadoEn,
                ActualizadoPor = d.ActualizadoPor
            })
            .ToListAsync();
    }

    public async Task<DescuentoPorCantidadDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.DescuentosPorCantidad
            .Include(d => d.Producto)
            .AsNoTracking()
            .Where(d => d.Id == id && d.TenantId == tenantId)
            .Select(d => new DescuentoPorCantidadDto
            {
                Id = d.Id,
                ProductoId = d.ProductoId,
                ProductoNombre = d.Producto != null ? d.Producto.Nombre : null,
                ProductoCodigo = d.Producto != null ? d.Producto.CodigoBarra : null,
                CantidadMinima = d.CantidadMinima,
                DescuentoPorcentaje = d.DescuentoPorcentaje,
                TipoAplicacion = d.TipoAplicacion,
                Activo = d.Activo,
                CreadoEn = d.CreadoEn,
                CreadoPor = d.CreadoPor,
                ActualizadoEn = d.ActualizadoEn,
                ActualizadoPor = d.ActualizadoPor
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<DescuentoPorCantidadDto>> ObtenerPorProductoIdAsync(int productoId, int tenantId)
    {
        // Incluye descuentos específicos del producto Y descuentos globales
        return await _db.DescuentosPorCantidad
            .Include(d => d.Producto)
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId &&
                        (d.ProductoId == productoId || d.TipoAplicacion == "Global"))
            .OrderByDescending(d => d.CreadoEn)
            .Select(d => new DescuentoPorCantidadDto
            {
                Id = d.Id,
                ProductoId = d.ProductoId,
                ProductoNombre = d.Producto != null ? d.Producto.Nombre : null,
                ProductoCodigo = d.Producto != null ? d.Producto.CodigoBarra : null,
                CantidadMinima = d.CantidadMinima,
                DescuentoPorcentaje = d.DescuentoPorcentaje,
                TipoAplicacion = d.TipoAplicacion,
                Activo = d.Activo,
                CreadoEn = d.CreadoEn,
                CreadoPor = d.CreadoPor,
                ActualizadoEn = d.ActualizadoEn,
                ActualizadoPor = d.ActualizadoPor
            })
            .ToListAsync();
    }

    public async Task<int> CrearAsync(DescuentoPorCantidadCreateDto dto, int tenantId)
    {
        // Siempre crea UN solo registro
        // - Global: ProductoId = null (aplica a todos los productos)
        // - Producto: ProductoId = el ID especificado
        var entity = new DescuentoPorCantidad
        {
            TenantId = tenantId,
            ProductoId = dto.ProductoId,  // null para Global, valor para Producto
            CantidadMinima = dto.CantidadMinima,
            DescuentoPorcentaje = dto.DescuentoPorcentaje,
            TipoAplicacion = dto.TipoAplicacion,
            CreadoEn = DateTime.UtcNow,
            Activo = true
        };

        _db.DescuentosPorCantidad.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, DescuentoPorCantidadCreateDto dto, int tenantId)
    {
        var entity = await _db.DescuentosPorCantidad
            .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);

        if (entity == null) return false;

        entity.CantidadMinima = dto.CantidadMinima;
        entity.DescuentoPorcentaje = dto.DescuentoPorcentaje;
        entity.TipoAplicacion = dto.TipoAplicacion;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var entity = await _db.DescuentosPorCantidad
            .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);

        if (entity == null) return false;

        _db.DescuentosPorCantidad.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleActivoAsync(int id, int tenantId, string? usuarioActual = null)
    {
        var entity = await _db.DescuentosPorCantidad
            .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = !entity.Activo;
        entity.ActualizadoEn = DateTime.UtcNow;
        entity.ActualizadoPor = usuarioActual;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId, string? usuarioActual = null)
    {
        var entities = await _db.DescuentosPorCantidad
            .Where(d => ids.Contains(d.Id) && d.TenantId == tenantId)
            .ToListAsync();

        foreach (var entity in entities)
        {
            entity.Activo = activo;
            entity.ActualizadoEn = DateTime.UtcNow;
            entity.ActualizadoPor = usuarioActual;
        }

        await _db.SaveChangesAsync();
        return entities.Count;
    }

    public async Task<bool> ExisteCantidadMinimaAsync(int? productoId, decimal cantidadMinima, int tenantId, int? excludeId = null)
    {
        var query = _db.DescuentosPorCantidad
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId && d.CantidadMinima == cantidadMinima);

        if (productoId.HasValue)
            query = query.Where(d => d.ProductoId == productoId.Value);
        else
            query = query.Where(d => d.ProductoId == null);

        if (excludeId.HasValue)
            query = query.Where(d => d.Id != excludeId.Value);

        return await query.AnyAsync();
    }

    public async Task<List<DescuentoPorCantidadDto>> ObtenerEscalaDescuentosAsync(int? productoId, int tenantId, int? excludeId = null)
    {
        var query = _db.DescuentosPorCantidad
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId);

        if (productoId.HasValue)
            query = query.Where(d => d.ProductoId == productoId.Value);
        else
            query = query.Where(d => d.ProductoId == null);

        if (excludeId.HasValue)
            query = query.Where(d => d.Id != excludeId.Value);

        return await query
            .OrderBy(d => d.CantidadMinima)
            .Select(d => new DescuentoPorCantidadDto
            {
                Id = d.Id,
                ProductoId = d.ProductoId,
                CantidadMinima = d.CantidadMinima,
                DescuentoPorcentaje = d.DescuentoPorcentaje,
                TipoAplicacion = d.TipoAplicacion,
                Activo = d.Activo,
                CreadoEn = d.CreadoEn
            })
            .ToListAsync();
    }
}
