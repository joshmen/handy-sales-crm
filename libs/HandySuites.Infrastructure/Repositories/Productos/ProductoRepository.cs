using HandySuites.Application.Productos.DTOs;
using HandySuites.Application.Productos.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Productos.Repositories;

public class ProductoRepository : IProductoRepository
{
    private readonly HandySuitesDbContext _db;

    public ProductoRepository(HandySuitesDbContext db)
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
                PrecioBase = p.PrecioBase,
                Costo = p.Costo
            })
            .ToListAsync();
    }

    public async Task<ProductoDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .Include(p => p.TasaImpuesto)
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
                Costo = p.Costo,
                Activo = p.Activo,
                PrecioIncluyeIva = p.PrecioIncluyeIva,
                TasaImpuestoId = p.TasaImpuestoId,
                TasaImpuestoNombre = p.TasaImpuesto != null ? p.TasaImpuesto.Nombre : null,
                TasaImpuestoTasa = p.TasaImpuesto != null ? p.TasaImpuesto.Tasa : (decimal?)null,
                ClaveSat = p.ClaveSat,
                ClaveUnidad = p.ClaveUnidad,
                Facturable = p.Facturable
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
            Costo = dto.Costo ?? 0m,
            PrecioIncluyeIva = dto.PrecioIncluyeIva ?? true,
            TasaImpuestoId = dto.TasaImpuestoId,
            ClaveSat = string.IsNullOrWhiteSpace(dto.ClaveSat) ? null : dto.ClaveSat.Trim(),
            ClaveUnidad = string.IsNullOrWhiteSpace(dto.ClaveUnidad) ? null : dto.ClaveUnidad.Trim(),
            Facturable = dto.Facturable ?? true,
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
        if (dto.Costo.HasValue) entity.Costo = dto.Costo.Value;
        if (dto.PrecioIncluyeIva.HasValue) entity.PrecioIncluyeIva = dto.PrecioIncluyeIva.Value;
        entity.TasaImpuestoId = dto.TasaImpuestoId;
        entity.ClaveSat = string.IsNullOrWhiteSpace(dto.ClaveSat) ? null : dto.ClaveSat.Trim();
        entity.ClaveUnidad = string.IsNullOrWhiteSpace(dto.ClaveUnidad) ? null : dto.ClaveUnidad.Trim();
        if (dto.Facturable.HasValue) entity.Facturable = dto.Facturable.Value;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> ContarPedidosActivosAsync(int productoId, int tenantId)
    {
        // DetallePedidos referencian pedidos; filtramos por pedidos no-terminales
        // del tenant correspondiente.
        return await _db.DetallePedidos
            .Where(dp => dp.ProductoId == productoId
                && dp.Pedido.TenantId == tenantId
                && dp.Pedido.Estado != Domain.Entities.EstadoPedido.Entregado
                && dp.Pedido.Estado != Domain.Entities.EstadoPedido.Cancelado)
            .CountAsync();
    }

    public async Task<bool> ExisteCodigoBarraAsync(string codigoBarra, int tenantId, int? excludeId)
    {
        if (string.IsNullOrWhiteSpace(codigoBarra)) return false;
        var query = _db.Productos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.CodigoBarra == codigoBarra);
        if (excludeId.HasValue)
            query = query.Where(p => p.Id != excludeId.Value);
        return await query.AnyAsync();
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

        // Tab "Sin clave SAT": facturables sin ClaveProdServ asignada
        if (filtro.SinClaveSat == true)
            query = query.Where(p => p.Facturable && (p.ClaveSat == null || p.ClaveSat == ""));

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
                Costo = p.Costo,
                CantidadActual = p.Inventario != null ? p.Inventario.CantidadActual : 0,
                StockMinimo = p.Inventario != null ? p.Inventario.StockMinimo : 0,
                Activo = p.Activo,
                PrecioIncluyeIva = p.PrecioIncluyeIva,
                TasaImpuestoId = p.TasaImpuestoId,
                ClaveSat = p.ClaveSat,
                ClaveUnidad = p.ClaveUnidad,
                Facturable = p.Facturable
            })
            .ToListAsync();

        // Conteo a nivel tenant (independiente de filtros/paginación) de productos
        // facturables sin ClaveSat — alimenta banner, subtítulo y badge del tab.
        var sinClaveSatCount = await _db.Productos.AsNoTracking()
            .CountAsync(p => p.TenantId == tenantId && p.Facturable && (p.ClaveSat == null || p.ClaveSat == ""));

        return new ProductoPaginatedResult
        {
            Items = items,
            TotalItems = totalItems,
            Pagina = filtro.PaginaEfectiva,
            TamanoPagina = filtro.TamanoPaginaEfectivo,
            SinClaveSatCount = sinClaveSatCount
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
        return await _db.Productos
            .Where(p => ids.Contains(p.Id) && p.TenantId == tenantId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Activo, activo)
                .SetProperty(e => e.ActualizadoEn, DateTime.UtcNow));
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

    public async Task<bool> ExisteFamiliaAsync(int familiaId, int tenantId)
        => await _db.FamiliasProductos.AsNoTracking()
            .AnyAsync(f => f.Id == familiaId && f.TenantId == tenantId);

    public async Task<bool> ExisteCategoriaAsync(int categoriaId, int tenantId)
        => await _db.CategoriasProductos.AsNoTracking()
            .AnyAsync(c => c.Id == categoriaId && c.TenantId == tenantId);

    public async Task<bool> ExisteUnidadMedidaAsync(int unidadId)
        => await _db.UnidadesMedida.AsNoTracking()
            .AnyAsync(u => u.Id == unidadId);
    // Nota: UnidadesMedida aplica global filter por tenant; la query filter se encarga de RLS.

    public async Task<int> BatchAsignarClaveSatAsync(ProductoBatchClaveSatDto dto, int tenantId)
    {
        var query = _db.Productos.Where(p => p.TenantId == tenantId);
        // Por categoría (aplica a todos) o por lista de IDs.
        if (dto.CategoriaId.HasValue)
            query = query.Where(p => p.CategoraId == dto.CategoriaId.Value);
        else
            query = query.Where(p => dto.Ids.Contains(p.Id));

        var claveSat = string.IsNullOrWhiteSpace(dto.ClaveSat) ? null : dto.ClaveSat.Trim();
        var claveUnidad = string.IsNullOrWhiteSpace(dto.ClaveUnidad) ? null : dto.ClaveUnidad.Trim();
        var now = DateTime.UtcNow;

        // Si viene unidad, se setea junto con la clave; si no, solo la clave (no borra la unidad existente).
        if (claveUnidad != null)
            return await query.ExecuteUpdateAsync(s => s
                .SetProperty(e => e.ClaveSat, claveSat)
                .SetProperty(e => e.ClaveUnidad, claveUnidad)
                .SetProperty(e => e.ActualizadoEn, now));

        return await query.ExecuteUpdateAsync(s => s
            .SetProperty(e => e.ClaveSat, claveSat)
            .SetProperty(e => e.ActualizadoEn, now));
    }
}
