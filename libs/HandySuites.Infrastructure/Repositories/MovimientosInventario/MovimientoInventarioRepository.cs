using HandySuites.Application.MovimientosInventario.DTOs;
using HandySuites.Application.MovimientosInventario.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.MovimientosInventario.Repositories;

public class MovimientoInventarioRepository : IMovimientoInventarioRepository
{
    private readonly HandySuitesDbContext _db;

    public MovimientoInventarioRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<MovimientoInventarioPaginadoDto> ObtenerPorFiltroAsync(MovimientoInventarioFiltroDto filtro, int tenantId)
    {
        var query = _db.MovimientosInventario
            .AsNoTracking()
            .Where(m => m.TenantId == tenantId);

        // Filtrar por producto
        if (filtro.ProductoId.HasValue)
            query = query.Where(m => m.ProductoId == filtro.ProductoId.Value);

        // Filtrar por tipo de movimiento
        if (!string.IsNullOrWhiteSpace(filtro.TipoMovimiento))
            query = query.Where(m => m.TipoMovimiento == filtro.TipoMovimiento);

        // Filtrar por motivo
        if (!string.IsNullOrWhiteSpace(filtro.Motivo))
            query = query.Where(m => m.Motivo == filtro.Motivo);

        // Filtrar por rango de fechas
        if (filtro.FechaDesde.HasValue)
            query = query.Where(m => m.CreadoEn >= filtro.FechaDesde.Value);

        if (filtro.FechaHasta.HasValue)
            query = query.Where(m => m.CreadoEn <= filtro.FechaHasta.Value.AddDays(1));

        // Búsqueda por texto
        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var busqueda = filtro.Busqueda.ToLower();
            query = query.Where(m =>
                m.Producto.Nombre.ToLower().Contains(busqueda) ||
                m.Producto.CodigoBarra.ToLower().Contains(busqueda) ||
                (m.Comentario != null && m.Comentario.ToLower().Contains(busqueda)));
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderByDescending(m => m.CreadoEn)
            .Skip((filtro.Pagina - 1) * filtro.TamanoPagina)
            .Take(filtro.TamanoPagina)
            .Select(m => new MovimientoInventarioListaDto
            {
                Id = m.Id,
                ProductoId = m.ProductoId,
                ProductoNombre = m.Producto.Nombre,
                ProductoCodigo = m.Producto.CodigoBarra,
                TipoMovimiento = m.TipoMovimiento,
                Cantidad = m.Cantidad,
                CantidadAnterior = m.CantidadAnterior,
                CantidadNueva = m.CantidadNueva,
                Motivo = m.Motivo,
                UsuarioNombre = m.Usuario.Nombre,
                CreadoEn = m.CreadoEn
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
            .Select(m => new MovimientoInventarioDto
            {
                Id = m.Id,
                ProductoId = m.ProductoId,
                ProductoNombre = m.Producto.Nombre,
                ProductoCodigo = m.Producto.CodigoBarra,
                TipoMovimiento = m.TipoMovimiento,
                Cantidad = m.Cantidad,
                CantidadAnterior = m.CantidadAnterior,
                CantidadNueva = m.CantidadNueva,
                Motivo = m.Motivo,
                Comentario = m.Comentario,
                UsuarioId = m.UsuarioId,
                UsuarioNombre = m.Usuario.Nombre,
                ReferenciaId = m.ReferenciaId,
                ReferenciaTipo = m.ReferenciaTipo,
                CreadoEn = m.CreadoEn
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<MovimientoInventarioListaDto>> ObtenerPorProductoAsync(int productoId, int tenantId, int limite = 10)
    {
        return await _db.MovimientosInventario
            .AsNoTracking()
            .Where(m => m.ProductoId == productoId && m.TenantId == tenantId)
            .OrderByDescending(m => m.CreadoEn)
            .Take(limite)
            .Select(m => new MovimientoInventarioListaDto
            {
                Id = m.Id,
                ProductoId = m.ProductoId,
                TipoMovimiento = m.TipoMovimiento,
                Cantidad = m.Cantidad,
                CantidadAnterior = m.CantidadAnterior,
                CantidadNueva = m.CantidadNueva,
                Motivo = m.Motivo,
                UsuarioNombre = m.Usuario.Nombre,
                CreadoEn = m.CreadoEn
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
