using HandySales.Application.Productos.DTOs;
using HandySales.Application.Productos.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Productos.Repositories;

public class ProductoRepository : IProductoRepository
{
    private readonly HandySalesDbContext _db;

    public ProductoRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<ProductoDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId)
            .Select(p => new ProductoDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                CodigoBarra = p.CodigoBarra,
                Descripcion = p.Descripcion,
                ImagenUrl = p.ImagenUrl,
                PrecioBase = p.PrecioBase
            })
            .ToListAsync();
    }

    public async Task<ProductoDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .Where(p => p.Id == id && p.TenantId == tenantId)
            .Select(p => new ProductoDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                CodigoBarra = p.CodigoBarra,
                Descripcion = p.Descripcion,
                ImagenUrl = p.ImagenUrl,
                FamiliaId = p.FamiliaId,
                CategoraId = p.CategoraId,
                UnidadMedidaId = p.UnidadMedidaId,
                PrecioBase = p.PrecioBase,
                Activo = p.Activo
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(ProductoCreateDto dto, int tenantId)
    {
        var entity = new Producto
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            CodigoBarra = dto.CodigoBarra,
            Descripcion = dto.Descripcion,
            FamiliaId = dto.FamiliaId,
            CategoraId = dto.CategoraId,
            UnidadMedidaId = dto.UnidadMedidaId,
            PrecioBase = dto.PrecioBase,
            CreadoEn = DateTime.UtcNow
        };

        _db.Productos.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, ProductoCreateDto dto, int tenantId)
    {
        var entity = await _db.Productos
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        entity.Nombre = dto.Nombre;
        entity.CodigoBarra = dto.CodigoBarra;
        entity.Descripcion = dto.Descripcion;
        entity.FamiliaId = dto.FamiliaId;
        entity.CategoraId = dto.CategoraId;
        entity.UnidadMedidaId = dto.UnidadMedidaId;
        entity.PrecioBase = dto.PrecioBase;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var entity = await _db.Productos
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        _db.Productos.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<ProductoPaginatedResult> ObtenerPorFiltroAsync(ProductoFiltroDto filtro, int tenantId)
    {
        var query = _db.Productos.AsNoTracking().Where(p => p.TenantId == tenantId);

        // Filtrar por activo: si se envía el filtro, aplicarlo; si no, mostrar todos
        if (filtro.Activo.HasValue)
            query = query.Where(p => p.Activo == filtro.Activo.Value);

        // Filtrar por familia
        if (filtro.FamiliaId.HasValue)
            query = query.Where(p => p.FamiliaId == filtro.FamiliaId.Value);

        // Filtrar por categoría
        if (filtro.CategoriaId.HasValue)
            query = query.Where(p => p.CategoraId == filtro.CategoriaId.Value);

        // Búsqueda por texto
        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var busqueda = filtro.Busqueda.ToLower();
            query = query.Where(p =>
                p.Nombre.ToLower().Contains(busqueda) ||
                p.CodigoBarra.ToLower().Contains(busqueda) ||
                (p.Descripcion != null && p.Descripcion.ToLower().Contains(busqueda)));
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderBy(p => p.Nombre)
            .Skip((filtro.PaginaEfectiva - 1) * filtro.TamanoPaginaEfectivo)
            .Take(filtro.TamanoPaginaEfectivo)
            .Select(p => new ProductoListaDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                CodigoBarra = p.CodigoBarra,
                Descripcion = p.Descripcion,
                ImagenUrl = p.ImagenUrl,
                FamiliaNombre = p.Familia.Nombre,
                CategoriaNombre = p.Categoria.Nombre,
                UnidadNombre = p.UnidadMedida.Nombre,
                PrecioBase = p.PrecioBase,
                CantidadActual = p.Inventario != null ? p.Inventario.CantidadActual : 0,
                StockMinimo = p.Inventario != null ? p.Inventario.StockMinimo : 0,
                Activo = p.Activo
            })
            .ToListAsync();

        return new ProductoPaginatedResult
        {
            Items = items,
            TotalItems = totalItems,
            Pagina = filtro.PaginaEfectiva,
            TamanoPagina = filtro.TamanoPaginaEfectivo
        };
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var entity = await _db.Productos
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        entity.Activo = activo;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var entities = await _db.Productos
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

    public async Task<bool> ActualizarImagenAsync(int id, string? imagenUrl, int tenantId)
    {
        var entity = await _db.Productos
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId);

        if (entity == null) return false;

        entity.ImagenUrl = imagenUrl;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }
}
