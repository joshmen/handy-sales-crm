using HandySales.Application.Inventario.DTOs;
using HandySales.Application.Inventario.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Inventario.Repositories;

public class InventarioRepository : IInventarioRepository
{
    private readonly HandySalesDbContext _db;

    public InventarioRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<List<InventarioDto>> ObtenerPorTenantAsync(int tenantId)
    {
        return await _db.Inventarios
            .AsNoTracking()
            .Where(i => i.TenantId == tenantId)
            .Select(i => new InventarioDto
            {
                ProductoId = i.ProductoId,
                CantidadActual = i.CantidadActual,
                StockMinimo = i.StockMinimo,
                StockMaximo = i.StockMaximo,
                ActualizadoEn = i.ActualizadoEn
            })
            .ToListAsync();
    }

    public async Task<InventarioDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Inventarios
            .AsNoTracking()
            .Where(i => i.Id == id && i.TenantId == tenantId)
            .Select(i => new InventarioDto
            {
                ProductoId = i.ProductoId,
                CantidadActual = i.CantidadActual,
                StockMinimo = i.StockMinimo,
                StockMaximo = i.StockMaximo,
                ActualizadoEn = i.ActualizadoEn
            })
            .FirstOrDefaultAsync();
    }

    public async Task<InventarioDto?> ObtenerPorProductoIdAsync(int productoId, int tenantId)
    {
        return await _db.Inventarios
            .AsNoTracking()
            .Where(i => i.ProductoId == productoId && i.TenantId == tenantId)
            .Select(i => new InventarioDto
            {
                Id = i.Id,
                ProductoId = i.ProductoId,
                CantidadActual = i.CantidadActual,
                StockMinimo = i.StockMinimo,
                StockMaximo = i.StockMaximo,
                ActualizadoEn = i.ActualizadoEn
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(InventarioCreateDto dto, int tenantId)
    {
        var nuevo = new Domain.Entities.Inventario
        {
            TenantId = tenantId,
            ProductoId = dto.ProductoId,
            CantidadActual = dto.CantidadActual,
            StockMinimo = dto.StockMinimo,
            StockMaximo = dto.StockMaximo,
            CreadoEn = DateTime.UtcNow,
            Activo = true
        };

        _db.Inventarios.Add(nuevo);
        await _db.SaveChangesAsync();
        return nuevo.Id;
    }

    public async Task<bool> ActualizarAsync(int productoId, InventarioUpdateDto dto, int tenantId)
    {
        var inventario = await _db.Inventarios
            .FirstOrDefaultAsync(i => i.ProductoId == productoId && i.TenantId == tenantId);

        if (inventario == null) return false;

        inventario.CantidadActual = dto.CantidadActual;
        inventario.StockMinimo = dto.StockMinimo;
        inventario.StockMaximo = dto.StockMaximo;
        inventario.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int productoId, int tenantId)
    {
        var inventario = await _db.Inventarios
            .FirstOrDefaultAsync(i => i.ProductoId == productoId && i.TenantId == tenantId);

        if (inventario == null) return false;

        _db.Inventarios.Remove(inventario);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<InventarioPaginatedResult> ObtenerPorFiltroAsync(InventarioFiltroDto filtro, int tenantId)
    {
        var query = _db.Inventarios
            .AsNoTracking()
            .Where(i => i.TenantId == tenantId)
            .AsQueryable();

        // Filtrar por producto específico
        if (filtro.ProductoId.HasValue)
            query = query.Where(i => i.ProductoId == filtro.ProductoId.Value);

        // Filtrar por bajo stock
        if (filtro.BajoStock.HasValue && filtro.BajoStock.Value)
            query = query.Where(i => i.CantidadActual <= i.StockMinimo);

        // Búsqueda por texto (nombre o código de producto)
        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var busqueda = filtro.Busqueda.ToLower();
            query = query.Where(i =>
                i.Producto.Nombre.ToLower().Contains(busqueda) ||
                i.Producto.CodigoBarra.ToLower().Contains(busqueda));
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderBy(i => i.Producto.Nombre)
            .Skip((filtro.Pagina - 1) * filtro.TamanoPagina)
            .Take(filtro.TamanoPagina)
            .Select(i => new InventarioListaDto
            {
                Id = i.Id,
                ProductoId = i.ProductoId,
                ProductoNombre = i.Producto.Nombre,
                ProductoCodigo = i.Producto.CodigoBarra,
                ProductoImagenUrl = i.Producto.ImagenUrl,
                ProductoUnidadMedida = i.Producto.UnidadMedida.Nombre,
                CantidadActual = i.CantidadActual,
                StockMinimo = i.StockMinimo,
                StockMaximo = i.StockMaximo,
                BajoStock = i.CantidadActual <= i.StockMinimo,
                ActualizadoEn = i.ActualizadoEn
            })
            .ToListAsync();

        return new InventarioPaginatedResult
        {
            Items = items,
            TotalItems = totalItems,
            Pagina = filtro.Pagina,
            TamanoPagina = filtro.TamanoPagina
        };
    }
}
