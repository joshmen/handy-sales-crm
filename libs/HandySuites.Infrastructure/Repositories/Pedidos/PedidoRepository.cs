using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Pedidos;

public class PedidoRepository : IPedidoRepository
{
    private readonly HandySuitesDbContext _db;

    public PedidoRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<int> CrearAsync(PedidoCreateDto dto, int usuarioId, int tenantId)
    {
        // Block orders for prospects pending approval
        var cliente = await _db.Clientes
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == dto.ClienteId && c.TenantId == tenantId);
        if (cliente != null && cliente.EsProspecto)
            throw new InvalidOperationException("El cliente es un prospecto pendiente de aprobación. No se pueden crear pedidos para prospectos.");

        var esVentaDirecta = dto.TipoVenta == TipoVenta.VentaDirecta;

        // Retry loop for unique constraint violations on NumeroPedido
        Pedido pedido = null!;
        for (int attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                var numeroPedido = await GenerarNumeroPedidoAsync(tenantId, esVentaDirecta ? "VD" : "PED");

                pedido = new Pedido
                {
                    TenantId = tenantId,
                    ClienteId = dto.ClienteId,
                    UsuarioId = usuarioId,
                    NumeroPedido = numeroPedido,
                    FechaPedido = DateTime.UtcNow,
                    FechaEntregaEstimada = dto.FechaEntregaEstimada,
                    Estado = esVentaDirecta ? EstadoPedido.Entregado : EstadoPedido.Borrador,
                    FechaEntregaReal = esVentaDirecta ? DateTime.UtcNow : null,
                    TipoVenta = dto.TipoVenta,
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
                break;
            }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pg && pg.SqlState == "23505")
            {
                // Detach the failed entity so next attempt starts clean
                _db.Entry(pedido).State = EntityState.Detached;
                if (attempt == 2)
                    throw new InvalidOperationException("No se pudo generar número de pedido único después de 3 intentos", ex);
                continue;
            }
        }

        // Batch-load all referenced products (avoids N+1)
        var productoIds = dto.Detalles.Select(d => d.ProductoId).Distinct().ToList();
        var productos = await _db.Productos
            .Where(p => productoIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        // Agregar detalles
        foreach (var detalleDto in dto.Detalles)
        {
            if (!productos.TryGetValue(detalleDto.ProductoId, out var producto)) continue;

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
                TipoVenta = p.TipoVenta,
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

    public async Task<PaginatedResult<PedidoListaDto>> ObtenerPorFiltroAsync(PedidoFiltroDto filtro, int tenantId, List<int>? filterByUsuarioIds = null)
    {
        var query = _db.Pedidos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo);

        if (filtro.ClienteId.HasValue)
            query = query.Where(p => p.ClienteId == filtro.ClienteId.Value);

        if (filterByUsuarioIds is { Count: > 0 })
            query = query.Where(p => filterByUsuarioIds.Contains(p.UsuarioId));
        else if (filtro.UsuarioId.HasValue)
            query = query.Where(p => p.UsuarioId == filtro.UsuarioId.Value);

        if (filtro.Estado.HasValue)
            query = query.Where(p => p.Estado == filtro.Estado.Value);

        if (filtro.TipoVenta.HasValue)
            query = query.Where(p => p.TipoVenta == filtro.TipoVenta.Value);

        if (filtro.FechaDesde.HasValue)
            query = query.Where(p => p.FechaPedido >= filtro.FechaDesde.Value);

        if (filtro.FechaHasta.HasValue)
        {
            var fechaFin = filtro.FechaHasta.Value.Date < DateTime.MaxValue.Date
                ? filtro.FechaHasta.Value.Date.AddDays(1)
                : DateTime.MaxValue;
            query = query.Where(p => p.FechaPedido < fechaFin);
        }

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
                TipoVenta = p.TipoVenta,
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
                TipoVenta = p.TipoVenta,
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
                TipoVenta = p.TipoVenta,
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

            // Batch-load productos (avoid N+1)
            var productoIds = dto.Detalles.Select(d => d.ProductoId).Distinct().ToList();
            var productos = await _db.Productos
                .Where(p => productoIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            // Agregar nuevos detalles
            foreach (var detalleDto in dto.Detalles)
            {
                if (!productos.TryGetValue(detalleDto.ProductoId, out var producto)) continue;

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

        // Solo se puede eliminar si está en Borrador. Un pedido confirmado/entregado
        // ya impactó inventario o flujo operativo; soft-deletarlo deja datos inconsistentes.
        if (pedido.Estado != EstadoPedido.Borrador)
            return false;

        // Soft delete via SaveChangesAsync override
        _db.Pedidos.Remove(pedido);

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AgregarDetalleAsync(int pedidoId, DetallePedidoCreateDto dto, int tenantId)
    {
        var pedido = await _db.Pedidos
            .FirstOrDefaultAsync(p => p.Id == pedidoId && p.TenantId == tenantId && p.Activo);

        if (pedido == null || pedido.Estado != EstadoPedido.Borrador)
            return false;

        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.Id == dto.ProductoId);
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

        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.Id == dto.ProductoId);
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

        // Soft delete via SaveChangesAsync override
        _db.DetallePedidos.Remove(detalle);

        await _db.SaveChangesAsync();
        await RecalcularTotalesAsync(pedidoId);

        return true;
    }

    public async Task<string> GenerarNumeroPedidoAsync(int tenantId, string tipo = "PED")
    {
        var fecha = DateTime.UtcNow;
        var prefijo = $"{tipo}-{fecha:yyyyMMdd}";

        // IgnoreQueryFilters: la unique-constraint de la DB incluye pedidos soft-deleted,
        // así que debemos contarlos al calcular la siguiente secuencia para evitar colisión.
        var ultimoNumero = await _db.Pedidos
            .IgnoreQueryFilters()
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
        // Validate the pedido belongs to the specified tenant before querying DetallePedidos
        var pedidoBelongsToTenant = await _db.Pedidos
            .AsNoTracking()
            .AnyAsync(p => p.Id == pedidoId && p.TenantId == tenantId);

        if (!pedidoBelongsToTenant)
            return 0;

        return (await _db.DetallePedidos
            .AsNoTracking()
            .Where(d => d.PedidoId == pedidoId && d.Activo)
            .Select(d => d.Total)
            .ToListAsync())
            .Sum();
    }

    public async Task<decimal> ObtenerStockDisponibleAsync(int productoId, int tenantId)
    {
        var inventario = await _db.Inventarios
            .AsNoTracking()
            .Where(i => i.ProductoId == productoId && i.TenantId == tenantId)
            .Select(i => i.CantidadActual)
            .FirstOrDefaultAsync();
        return inventario;
    }

    public async Task<string> ObtenerNombreProductoAsync(int productoId, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .Where(p => p.Id == productoId && p.TenantId == tenantId)
            .Select(p => p.Nombre)
            .FirstOrDefaultAsync() ?? $"Producto #{productoId}";
    }

    public async Task<bool> ExisteClienteAsync(int clienteId, int tenantId)
    {
        return await _db.Clientes
            .AsNoTracking()
            .AnyAsync(c => c.Id == clienteId && c.TenantId == tenantId);
    }

    public async Task<bool> ExisteProductoAsync(int productoId, int tenantId)
    {
        return await _db.Productos
            .AsNoTracking()
            .AnyAsync(p => p.Id == productoId && p.TenantId == tenantId);
    }

    public async Task<bool> ExisteListaPrecioAsync(int listaPrecioId, int tenantId)
    {
        return await _db.ListasPrecios
            .AsNoTracking()
            .AnyAsync(l => l.Id == listaPrecioId && l.TenantId == tenantId);
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
            (EstadoPedido.Borrador, EstadoPedido.Confirmado) => true,
            (EstadoPedido.Borrador, EstadoPedido.Cancelado) => true,
            (EstadoPedido.Confirmado, EstadoPedido.EnRuta) => true,
            (EstadoPedido.Confirmado, EstadoPedido.Cancelado) => true,
            (EstadoPedido.EnRuta, EstadoPedido.Entregado) => true,
            (EstadoPedido.EnRuta, EstadoPedido.Cancelado) => true,
            // Legacy: allow old states to transition forward for safety
#pragma warning disable CS0618 // Obsolete member usage intentional for backwards compatibility
            (EstadoPedido.Enviado, EstadoPedido.Confirmado) => true,
            (EstadoPedido.EnProceso, EstadoPedido.EnRuta) => true,
#pragma warning restore CS0618
            _ => false
        };
    }
}
