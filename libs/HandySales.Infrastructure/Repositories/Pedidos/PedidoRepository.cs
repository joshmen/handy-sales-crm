using HandySales.Application.Pedidos.DTOs;
using HandySales.Application.Pedidos.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories.Pedidos;

public class PedidoRepository : IPedidoRepository
{
    private readonly HandySalesDbContext _db;

    public PedidoRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<int> CrearAsync(PedidoCreateDto dto, int usuarioId, int tenantId)
    {
        var numeroPedido = await GenerarNumeroPedidoAsync(tenantId);

        var pedido = new Pedido
        {
            TenantId = tenantId,
            ClienteId = dto.ClienteId,
            UsuarioId = usuarioId,
            NumeroPedido = numeroPedido,
            FechaPedido = DateTime.UtcNow,
            FechaEntregaEstimada = dto.FechaEntregaEstimada,
            Estado = EstadoPedido.Borrador,
            Notas = dto.Notas,
            DireccionEntrega = dto.DireccionEntrega,
            Latitud = dto.Latitud,
            Longitud = dto.Longitud,
            ListaPrecioId = dto.ListaPrecioId,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };

        _db.Pedidos.Add(pedido);
        await _db.SaveChangesAsync();

        // Agregar detalles
        foreach (var detalleDto in dto.Detalles)
        {
            var producto = await _db.Productos.FindAsync(detalleDto.ProductoId);
            if (producto == null) continue;

            var precioUnitario = detalleDto.PrecioUnitario ?? producto.PrecioBase;
            var descuento = detalleDto.Descuento ?? 0;
            var subtotal = detalleDto.Cantidad * precioUnitario - descuento;
            var impuesto = subtotal * 0.16m; // IVA 16%
            var total = subtotal + impuesto;

            var detalle = new DetallePedido
            {
                PedidoId = pedido.Id,
                ProductoId = detalleDto.ProductoId,
                Cantidad = detalleDto.Cantidad,
                PrecioUnitario = precioUnitario,
                Descuento = descuento,
                PorcentajeDescuento = detalleDto.PorcentajeDescuento ?? 0,
                Subtotal = subtotal,
                Impuesto = impuesto,
                Total = total,
                Notas = detalleDto.Notas,
                Activo = true,
                CreadoEn = DateTime.UtcNow
            };

            _db.DetallePedidos.Add(detalle);
        }

        await _db.SaveChangesAsync();

        // Recalcular totales del pedido
        await RecalcularTotalesAsync(pedido.Id);

        return pedido.Id;
    }

    public async Task<PedidoDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.Id == id && p.TenantId == tenantId && p.Activo)
            .Select(p => new PedidoDto
            {
                Id = p.Id,
                NumeroPedido = p.NumeroPedido,
                ClienteId = p.ClienteId,
                ClienteNombre = p.Cliente.Nombre,
                UsuarioId = p.UsuarioId,
                UsuarioNombre = p.Usuario.Nombre,
                FechaPedido = p.FechaPedido,
                FechaEntregaEstimada = p.FechaEntregaEstimada,
                FechaEntregaReal = p.FechaEntregaReal,
                Estado = p.Estado,
                Subtotal = p.Subtotal,
                Descuento = p.Descuento,
                Impuestos = p.Impuestos,
                Total = p.Total,
                Notas = p.Notas,
                DireccionEntrega = p.DireccionEntrega,
                Latitud = p.Latitud,
                Longitud = p.Longitud,
                ListaPrecioId = p.ListaPrecioId,
                ListaPrecioNombre = p.ListaPrecio != null ? p.ListaPrecio.Nombre : null,
                CreadoEn = p.CreadoEn,
                ActualizadoEn = p.ActualizadoEn,
                Detalles = p.Detalles.Where(d => d.Activo).Select(d => new DetallePedidoDto
                {
                    Id = d.Id,
                    ProductoId = d.ProductoId,
                    ProductoNombre = d.Producto.Nombre,
                    ProductoSku = d.Producto.CodigoBarra,
                    ProductoImagen = null,
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.PrecioUnitario,
                    Descuento = d.Descuento,
                    PorcentajeDescuento = d.PorcentajeDescuento,
                    Subtotal = d.Subtotal,
                    Impuesto = d.Impuesto,
                    Total = d.Total,
                    Notas = d.Notas
                }).ToList()
            })
            .FirstOrDefaultAsync();
    }

    public async Task<PedidoDto?> ObtenerPorNumeroAsync(string numeroPedido, int tenantId)
    {
        var pedido = await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.NumeroPedido == numeroPedido && p.TenantId == tenantId && p.Activo)
            .Select(p => p.Id)
            .FirstOrDefaultAsync();

        if (pedido == 0) return null;
        return await ObtenerPorIdAsync(pedido, tenantId);
    }

    public async Task<PaginatedResult<PedidoListaDto>> ObtenerPorFiltroAsync(PedidoFiltroDto filtro, int tenantId)
    {
        var query = _db.Pedidos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo);

        if (filtro.ClienteId.HasValue)
            query = query.Where(p => p.ClienteId == filtro.ClienteId.Value);

        if (filtro.UsuarioId.HasValue)
            query = query.Where(p => p.UsuarioId == filtro.UsuarioId.Value);

        if (filtro.Estado.HasValue)
            query = query.Where(p => p.Estado == filtro.Estado.Value);

        if (filtro.FechaDesde.HasValue)
            query = query.Where(p => p.FechaPedido >= filtro.FechaDesde.Value);

        if (filtro.FechaHasta.HasValue)
            query = query.Where(p => p.FechaPedido <= filtro.FechaHasta.Value);

        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var busqueda = filtro.Busqueda.ToLower();
            query = query.Where(p =>
                p.NumeroPedido.ToLower().Contains(busqueda) ||
                p.Cliente.Nombre.ToLower().Contains(busqueda));
        }

        var totalItems = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.FechaPedido)
            .Skip((filtro.PaginaEfectiva - 1) * filtro.TamanoPaginaEfectivo)
            .Take(filtro.TamanoPaginaEfectivo)
            .Select(p => new PedidoListaDto
            {
                Id = p.Id,
                NumeroPedido = p.NumeroPedido,
                ClienteId = p.ClienteId,
                ClienteNombre = p.Cliente.Nombre,
                UsuarioId = p.UsuarioId,
                UsuarioNombre = p.Usuario.Nombre,
                FechaPedido = p.FechaPedido,
                FechaEntregaEstimada = p.FechaEntregaEstimada,
                Estado = p.Estado,
                Total = p.Total,
                CantidadProductos = p.Detalles.Count(d => d.Activo)
            })
            .ToListAsync();

        return new PaginatedResult<PedidoListaDto>
        {
            Items = items,
            TotalItems = totalItems,
            Pagina = filtro.PaginaEfectiva,
            TamanoPagina = filtro.TamanoPaginaEfectivo
        };
    }

    public async Task<List<PedidoListaDto>> ObtenerPorClienteAsync(int clienteId, int tenantId)
    {
        return await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.ClienteId == clienteId && p.TenantId == tenantId && p.Activo)
            .OrderByDescending(p => p.FechaPedido)
            .Select(p => new PedidoListaDto
            {
                Id = p.Id,
                NumeroPedido = p.NumeroPedido,
                ClienteId = p.ClienteId,
                ClienteNombre = p.Cliente.Nombre,
                UsuarioId = p.UsuarioId,
                UsuarioNombre = p.Usuario.Nombre,
                FechaPedido = p.FechaPedido,
                FechaEntregaEstimada = p.FechaEntregaEstimada,
                Estado = p.Estado,
                Total = p.Total,
                CantidadProductos = p.Detalles.Count(d => d.Activo)
            })
            .ToListAsync();
    }

    public async Task<List<PedidoListaDto>> ObtenerPorUsuarioAsync(int usuarioId, int tenantId)
    {
        return await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.UsuarioId == usuarioId && p.TenantId == tenantId && p.Activo)
            .OrderByDescending(p => p.FechaPedido)
            .Select(p => new PedidoListaDto
            {
                Id = p.Id,
                NumeroPedido = p.NumeroPedido,
                ClienteId = p.ClienteId,
                ClienteNombre = p.Cliente.Nombre,
                UsuarioId = p.UsuarioId,
                UsuarioNombre = p.Usuario.Nombre,
                FechaPedido = p.FechaPedido,
                FechaEntregaEstimada = p.FechaEntregaEstimada,
                Estado = p.Estado,
                Total = p.Total,
                CantidadProductos = p.Detalles.Count(d => d.Activo)
            })
            .ToListAsync();
    }

    public async Task<bool> ActualizarAsync(int id, PedidoUpdateDto dto, int tenantId)
    {
        var pedido = await _db.Pedidos
            .Include(p => p.Detalles)
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.Activo);

        if (pedido == null) return false;

        // Solo se puede actualizar si está en borrador
        if (pedido.Estado != EstadoPedido.Borrador)
            return false;

        pedido.FechaEntregaEstimada = dto.FechaEntregaEstimada ?? pedido.FechaEntregaEstimada;
        pedido.Notas = dto.Notas ?? pedido.Notas;
        pedido.DireccionEntrega = dto.DireccionEntrega ?? pedido.DireccionEntrega;
        pedido.Latitud = dto.Latitud ?? pedido.Latitud;
        pedido.Longitud = dto.Longitud ?? pedido.Longitud;
        pedido.ListaPrecioId = dto.ListaPrecioId ?? pedido.ListaPrecioId;
        pedido.ActualizadoEn = DateTime.UtcNow;

        // Si se envían detalles, reemplazar todos
        if (dto.Detalles != null && dto.Detalles.Any())
        {
            // Marcar detalles anteriores como inactivos
            foreach (var detalle in pedido.Detalles)
            {
                detalle.Activo = false;
            }

            // Agregar nuevos detalles
            foreach (var detalleDto in dto.Detalles)
            {
                var producto = await _db.Productos.FindAsync(detalleDto.ProductoId);
                if (producto == null) continue;

                var precioUnitario = detalleDto.PrecioUnitario ?? producto.PrecioBase;
                var descuento = detalleDto.Descuento ?? 0;
                var subtotal = detalleDto.Cantidad * precioUnitario - descuento;
                var impuesto = subtotal * 0.16m;
                var total = subtotal + impuesto;

                var detalle = new DetallePedido
                {
                    PedidoId = pedido.Id,
                    ProductoId = detalleDto.ProductoId,
                    Cantidad = detalleDto.Cantidad,
                    PrecioUnitario = precioUnitario,
                    Descuento = descuento,
                    PorcentajeDescuento = detalleDto.PorcentajeDescuento ?? 0,
                    Subtotal = subtotal,
                    Impuesto = impuesto,
                    Total = total,
                    Notas = detalleDto.Notas,
                    Activo = true,
                    CreadoEn = DateTime.UtcNow
                };

                _db.DetallePedidos.Add(detalle);
            }
        }

        await _db.SaveChangesAsync();
        await RecalcularTotalesAsync(pedido.Id);

        return true;
    }

    public async Task<bool> CambiarEstadoAsync(int id, EstadoPedido nuevoEstado, string? notas, int tenantId)
    {
        var pedido = await _db.Pedidos
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.Activo);

        if (pedido == null) return false;

        // Validar transiciones de estado válidas
        if (!EsTransicionValida(pedido.Estado, nuevoEstado))
            return false;

        pedido.Estado = nuevoEstado;
        pedido.ActualizadoEn = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(notas))
        {
            pedido.Notas = string.IsNullOrWhiteSpace(pedido.Notas)
                ? notas
                : $"{pedido.Notas}\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] {notas}";
        }

        if (nuevoEstado == EstadoPedido.Entregado)
        {
            pedido.FechaEntregaReal = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> EliminarAsync(int id, int tenantId)
    {
        var pedido = await _db.Pedidos
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.Activo);

        if (pedido == null) return false;

        // Soft delete
        pedido.Activo = false;
        pedido.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AgregarDetalleAsync(int pedidoId, DetallePedidoCreateDto dto, int tenantId)
    {
        var pedido = await _db.Pedidos
            .FirstOrDefaultAsync(p => p.Id == pedidoId && p.TenantId == tenantId && p.Activo);

        if (pedido == null || pedido.Estado != EstadoPedido.Borrador)
            return false;

        var producto = await _db.Productos.FindAsync(dto.ProductoId);
        if (producto == null) return false;

        var precioUnitario = dto.PrecioUnitario ?? producto.PrecioBase;
        var descuento = dto.Descuento ?? 0;
        var subtotal = dto.Cantidad * precioUnitario - descuento;
        var impuesto = subtotal * 0.16m;
        var total = subtotal + impuesto;

        var detalle = new DetallePedido
        {
            PedidoId = pedidoId,
            ProductoId = dto.ProductoId,
            Cantidad = dto.Cantidad,
            PrecioUnitario = precioUnitario,
            Descuento = descuento,
            PorcentajeDescuento = dto.PorcentajeDescuento ?? 0,
            Subtotal = subtotal,
            Impuesto = impuesto,
            Total = total,
            Notas = dto.Notas,
            Activo = true,
            CreadoEn = DateTime.UtcNow
        };

        _db.DetallePedidos.Add(detalle);
        await _db.SaveChangesAsync();
        await RecalcularTotalesAsync(pedidoId);

        return true;
    }

    public async Task<bool> ActualizarDetalleAsync(int pedidoId, int detalleId, DetallePedidoCreateDto dto, int tenantId)
    {
        var pedido = await _db.Pedidos
            .FirstOrDefaultAsync(p => p.Id == pedidoId && p.TenantId == tenantId && p.Activo);

        if (pedido == null || pedido.Estado != EstadoPedido.Borrador)
            return false;

        var detalle = await _db.DetallePedidos
            .FirstOrDefaultAsync(d => d.Id == detalleId && d.PedidoId == pedidoId && d.Activo);

        if (detalle == null) return false;

        var producto = await _db.Productos.FindAsync(dto.ProductoId);
        if (producto == null) return false;

        var precioUnitario = dto.PrecioUnitario ?? producto.PrecioBase;
        var descuento = dto.Descuento ?? 0;
        var subtotal = dto.Cantidad * precioUnitario - descuento;
        var impuesto = subtotal * 0.16m;
        var total = subtotal + impuesto;

        detalle.ProductoId = dto.ProductoId;
        detalle.Cantidad = dto.Cantidad;
        detalle.PrecioUnitario = precioUnitario;
        detalle.Descuento = descuento;
        detalle.PorcentajeDescuento = dto.PorcentajeDescuento ?? 0;
        detalle.Subtotal = subtotal;
        detalle.Impuesto = impuesto;
        detalle.Total = total;
        detalle.Notas = dto.Notas;
        detalle.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await RecalcularTotalesAsync(pedidoId);

        return true;
    }

    public async Task<bool> EliminarDetalleAsync(int pedidoId, int detalleId, int tenantId)
    {
        var pedido = await _db.Pedidos
            .FirstOrDefaultAsync(p => p.Id == pedidoId && p.TenantId == tenantId && p.Activo);

        if (pedido == null || pedido.Estado != EstadoPedido.Borrador)
            return false;

        var detalle = await _db.DetallePedidos
            .FirstOrDefaultAsync(d => d.Id == detalleId && d.PedidoId == pedidoId && d.Activo);

        if (detalle == null) return false;

        detalle.Activo = false;
        detalle.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await RecalcularTotalesAsync(pedidoId);

        return true;
    }

    public async Task<string> GenerarNumeroPedidoAsync(int tenantId)
    {
        var fecha = DateTime.UtcNow;
        var prefijo = $"PED-{fecha:yyyyMMdd}";

        var ultimoNumero = await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.NumeroPedido.StartsWith(prefijo))
            .OrderByDescending(p => p.NumeroPedido)
            .Select(p => p.NumeroPedido)
            .FirstOrDefaultAsync();

        int secuencia = 1;
        if (!string.IsNullOrEmpty(ultimoNumero))
        {
            var partes = ultimoNumero.Split('-');
            if (partes.Length == 3 && int.TryParse(partes[2], out var num))
            {
                secuencia = num + 1;
            }
        }

        return $"{prefijo}-{secuencia:D4}";
    }

    public async Task<decimal> CalcularTotalAsync(int pedidoId, int tenantId)
    {
        return await _db.DetallePedidos
            .AsNoTracking()
            .Where(d => d.PedidoId == pedidoId && d.Activo)
            .SumAsync(d => d.Total);
    }

    private async Task RecalcularTotalesAsync(int pedidoId)
    {
        var pedido = await _db.Pedidos.FindAsync(pedidoId);
        if (pedido == null) return;

        var detalles = await _db.DetallePedidos
            .Where(d => d.PedidoId == pedidoId && d.Activo)
            .ToListAsync();

        pedido.Subtotal = detalles.Sum(d => d.Subtotal);
        pedido.Descuento = detalles.Sum(d => d.Descuento);
        pedido.Impuestos = detalles.Sum(d => d.Impuesto);
        pedido.Total = detalles.Sum(d => d.Total);
        pedido.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    private bool EsTransicionValida(EstadoPedido estadoActual, EstadoPedido nuevoEstado)
    {
        return (estadoActual, nuevoEstado) switch
        {
            (EstadoPedido.Borrador, EstadoPedido.Enviado) => true,
            (EstadoPedido.Borrador, EstadoPedido.Cancelado) => true,
            (EstadoPedido.Enviado, EstadoPedido.Confirmado) => true,
            (EstadoPedido.Enviado, EstadoPedido.Cancelado) => true,
            (EstadoPedido.Confirmado, EstadoPedido.EnProceso) => true,
            (EstadoPedido.Confirmado, EstadoPedido.Cancelado) => true,
            (EstadoPedido.EnProceso, EstadoPedido.EnRuta) => true,
            (EstadoPedido.EnProceso, EstadoPedido.Cancelado) => true,
            (EstadoPedido.EnRuta, EstadoPedido.Entregado) => true,
            (EstadoPedido.EnRuta, EstadoPedido.Cancelado) => true,
            _ => false
        };
    }
}
