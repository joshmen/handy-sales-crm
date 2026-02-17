using HandySales.Application.MovimientosInventario.DTOs;
using HandySales.Application.MovimientosInventario.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.MovimientosInventario.Repositories;

public class MovimientoInventarioRepository : IMovimientoInventarioRepository
{
    private readonly HandySalesDbContext _db;

    public MovimientoInventarioRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<MovimientoInventarioPaginadoDto> ObtenerPorFiltroAsync(MovimientoInventarioFiltroDto filtro, int tenantId)
    {
        var query = _db.MovimientosInventario
            .AsNoTracking()
            .Where(m => m.TenantId == tenantId)
            .Join(_db.Productos,
                m => m.ProductoId,
                p => p.Id,
                (m, p) => new { Movimiento = m, Producto = p })
            .Join(_db.Usuarios,
                mp => mp.Movimiento.UsuarioId,
                u => u.Id,
                (mp, u) => new { mp.Movimiento, mp.Producto, Usuario = u });

        // Filtrar por producto
        if (filtro.ProductoId.HasValue)
            query = query.Where(x => x.Movimiento.ProductoId == filtro.ProductoId.Value);

        // Filtrar por tipo de movimiento
        if (!string.IsNullOrWhiteSpace(filtro.TipoMovimiento))
            query = query.Where(x => x.Movimiento.TipoMovimiento == filtro.TipoMovimiento);

        // Filtrar por motivo
        if (!string.IsNullOrWhiteSpace(filtro.Motivo))
            query = query.Where(x => x.Movimiento.Motivo == filtro.Motivo);

        // Filtrar por rango de fechas
        if (filtro.FechaDesde.HasValue)
            query = query.Where(x => x.Movimiento.CreadoEn >= filtro.FechaDesde.Value);

        if (filtro.FechaHasta.HasValue)
            query = query.Where(x => x.Movimiento.CreadoEn <= filtro.FechaHasta.Value.AddDays(1));

        // Búsqueda por texto
        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var busqueda = filtro.Busqueda.ToLower();
            query = query.Where(x =>
                x.Producto.Nombre.ToLower().Contains(busqueda) ||
                x.Producto.CodigoBarra.ToLower().Contains(busqueda) ||
                (x.Movimiento.Comentario != null && x.Movimiento.Comentario.ToLower().Contains(busqueda)));
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderByDescending(x => x.Movimiento.CreadoEn)
            .Skip((filtro.Pagina - 1) * filtro.TamanoPagina)
            .Take(filtro.TamanoPagina)
            .Select(x => new MovimientoInventarioListaDto
            {
                Id = x.Movimiento.Id,
                ProductoId = x.Movimiento.ProductoId,
                ProductoNombre = x.Producto.Nombre,
                ProductoCodigo = x.Producto.CodigoBarra,
                TipoMovimiento = x.Movimiento.TipoMovimiento,
                Cantidad = x.Movimiento.Cantidad,
                CantidadAnterior = x.Movimiento.CantidadAnterior,
                CantidadNueva = x.Movimiento.CantidadNueva,
                Motivo = x.Movimiento.Motivo,
                UsuarioNombre = x.Usuario.Nombre,
                CreadoEn = x.Movimiento.CreadoEn
            })
            .ToListAsync();

        return new MovimientoInventarioPaginadoDto
        {
            Items = items,
            TotalItems = totalItems,
            Pagina = filtro.Pagina,
            TamanoPagina = filtro.TamanoPagina,
            TotalPaginas = (int)Math.Ceiling((double)totalItems / filtro.TamanoPagina)
        };
    }

    public async Task<MovimientoInventarioDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.MovimientosInventario
            .AsNoTracking()
            .Where(m => m.Id == id && m.TenantId == tenantId)
            .Join(_db.Productos,
                m => m.ProductoId,
                p => p.Id,
                (m, p) => new { Movimiento = m, Producto = p })
            .Join(_db.Usuarios,
                mp => mp.Movimiento.UsuarioId,
                u => u.Id,
                (mp, u) => new { mp.Movimiento, mp.Producto, Usuario = u })
            .Select(x => new MovimientoInventarioDto
            {
                Id = x.Movimiento.Id,
                ProductoId = x.Movimiento.ProductoId,
                ProductoNombre = x.Producto.Nombre,
                ProductoCodigo = x.Producto.CodigoBarra,
                TipoMovimiento = x.Movimiento.TipoMovimiento,
                Cantidad = x.Movimiento.Cantidad,
                CantidadAnterior = x.Movimiento.CantidadAnterior,
                CantidadNueva = x.Movimiento.CantidadNueva,
                Motivo = x.Movimiento.Motivo,
                Comentario = x.Movimiento.Comentario,
                UsuarioId = x.Movimiento.UsuarioId,
                UsuarioNombre = x.Usuario.Nombre,
                ReferenciaId = x.Movimiento.ReferenciaId,
                ReferenciaTipo = x.Movimiento.ReferenciaTipo,
                CreadoEn = x.Movimiento.CreadoEn
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<MovimientoInventarioListaDto>> ObtenerPorProductoAsync(int productoId, int tenantId, int limite = 10)
    {
        return await _db.MovimientosInventario
            .AsNoTracking()
            .Where(m => m.ProductoId == productoId && m.TenantId == tenantId)
            .Join(_db.Usuarios,
                m => m.UsuarioId,
                u => u.Id,
                (m, u) => new { Movimiento = m, Usuario = u })
            .OrderByDescending(x => x.Movimiento.CreadoEn)
            .Take(limite)
            .Select(x => new MovimientoInventarioListaDto
            {
                Id = x.Movimiento.Id,
                ProductoId = x.Movimiento.ProductoId,
                TipoMovimiento = x.Movimiento.TipoMovimiento,
                Cantidad = x.Movimiento.Cantidad,
                CantidadAnterior = x.Movimiento.CantidadAnterior,
                CantidadNueva = x.Movimiento.CantidadNueva,
                Motivo = x.Movimiento.Motivo,
                UsuarioNombre = x.Usuario.Nombre,
                CreadoEn = x.Movimiento.CreadoEn
            })
            .ToListAsync();
    }

    public async Task<int> CrearAsync(MovimientoInventarioCreateDto dto, int tenantId, int usuarioId, decimal cantidadAnterior, decimal cantidadNueva)
    {
        var movimiento = new MovimientoInventario
        {
            TenantId = tenantId,
            ProductoId = dto.ProductoId,
            TipoMovimiento = dto.TipoMovimiento.ToUpperInvariant(),
            Cantidad = dto.Cantidad,
            CantidadAnterior = cantidadAnterior,
            CantidadNueva = cantidadNueva,
            Motivo = dto.Motivo,
            Comentario = dto.Comentario,
            UsuarioId = usuarioId,
            CreadoEn = DateTime.UtcNow,
            Activo = true
        };

        _db.MovimientosInventario.Add(movimiento);
        await _db.SaveChangesAsync();
        return movimiento.Id;
    }
}
