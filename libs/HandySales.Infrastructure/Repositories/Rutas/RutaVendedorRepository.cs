using HandySales.Application.Rutas.DTOs;
using HandySales.Application.Rutas.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories.Rutas;

public class RutaVendedorRepository : IRutaVendedorRepository
{
    private readonly HandySalesDbContext _db;

    public RutaVendedorRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<int> CrearAsync(RutaVendedor ruta)
    {
        _db.RutasVendedor.Add(ruta);
        await _db.SaveChangesAsync();
        return ruta.Id;
    }

    public async Task<RutaVendedorDto?> ObtenerPorIdAsync(int id)
    {
        var ruta = await _db.RutasVendedor
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Zona)
            .Include(r => r.Detalles)
                .ThenInclude(d => d.Cliente)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (ruta == null) return null;

        return MapToDto(ruta);
    }

    public async Task<RutaVendedor?> ObtenerEntidadAsync(int id)
    {
        return await _db.RutasVendedor
            .Include(r => r.Detalles)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<bool> ActualizarAsync(RutaVendedor ruta)
    {
        _db.RutasVendedor.Update(ruta);
        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<bool> EliminarAsync(int id)
    {
        var ruta = await _db.RutasVendedor.FindAsync(id);
        if (ruta == null) return false;

        ruta.Activo = false;
        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<(List<RutaListaDto> Items, int TotalCount)> ObtenerPorFiltroAsync(int tenantId, RutaFiltroDto filtro)
    {
        var query = _db.RutasVendedor
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Zona)
            .Include(r => r.Detalles)
            .Where(r => r.TenantId == tenantId)
            .AsQueryable();

        if (filtro.MostrarInactivos != true)
            query = query.Where(r => r.Activo);

        if (filtro.UsuarioId.HasValue)
            query = query.Where(r => r.UsuarioId == filtro.UsuarioId);

        if (filtro.ZonaId.HasValue)
            query = query.Where(r => r.ZonaId == filtro.ZonaId);

        if (filtro.Estado.HasValue)
            query = query.Where(r => r.Estado == filtro.Estado);

        if (filtro.FechaDesde.HasValue)
            query = query.Where(r => r.Fecha >= filtro.FechaDesde.Value.Date);

        if (filtro.FechaHasta.HasValue)
            query = query.Where(r => r.Fecha <= filtro.FechaHasta.Value.Date);

        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var busqueda = filtro.Busqueda.ToLower();
            query = query.Where(r =>
                r.Nombre.ToLower().Contains(busqueda) ||
                r.Usuario.Nombre.ToLower().Contains(busqueda));
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(r => r.Fecha)
            .ThenBy(r => r.HoraInicioEstimada)
            .Skip((filtro.Pagina - 1) * filtro.TamanoPagina)
            .Take(filtro.TamanoPagina)
            .Select(r => new RutaListaDto
            {
                Id = r.Id,
                Nombre = r.Nombre,
                UsuarioNombre = r.Usuario.Nombre,
                ZonaNombre = r.Zona != null ? r.Zona.Nombre : null,
                Fecha = r.Fecha,
                Estado = r.Estado,
                TotalParadas = r.Detalles.Count,
                ParadasCompletadas = r.Detalles.Count(d => d.Estado == EstadoParada.Visitado),
                KilometrosEstimados = r.KilometrosEstimados,
                Activo = r.Activo
            })
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<List<RutaVendedorDto>> ObtenerPorUsuarioAsync(int tenantId, int usuarioId)
    {
        var rutas = await _db.RutasVendedor
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Zona)
            .Include(r => r.Detalles)
                .ThenInclude(d => d.Cliente)
            .Where(r => r.TenantId == tenantId && r.UsuarioId == usuarioId && r.Activo == true)
            .OrderByDescending(r => r.Fecha)
            .Take(10)
            .ToListAsync();

        return rutas.Select(MapToDto).ToList();
    }

    public async Task<RutaVendedorDto?> ObtenerRutaDelDiaAsync(int tenantId, int usuarioId, DateTime? fecha = null)
    {
        var fechaBusqueda = fecha?.Date ?? DateTime.Today;

        var ruta = await _db.RutasVendedor
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Zona)
            .Include(r => r.Detalles.OrderBy(d => d.OrdenVisita))
                .ThenInclude(d => d.Cliente)
            .FirstOrDefaultAsync(r =>
                r.TenantId == tenantId &&
                r.UsuarioId == usuarioId &&
                r.Fecha.Date == fechaBusqueda &&
                r.Activo == true);

        return ruta != null ? MapToDto(ruta) : null;
    }

    public async Task<List<RutaVendedorDto>> ObtenerRutasPendientesAsync(int tenantId, int usuarioId)
    {
        var rutas = await _db.RutasVendedor
            .AsNoTracking()
            .Include(r => r.Usuario)
            .Include(r => r.Zona)
            .Include(r => r.Detalles)
                .ThenInclude(d => d.Cliente)
            .Where(r =>
                r.TenantId == tenantId &&
                r.UsuarioId == usuarioId &&
                (r.Estado == EstadoRuta.Planificada || r.Estado == EstadoRuta.EnProgreso) &&
                r.Fecha >= DateTime.Today &&
                r.Activo == true)
            .OrderBy(r => r.Fecha)
            .ToListAsync();

        return rutas.Select(MapToDto).ToList();
    }

    public async Task<bool> IniciarRutaAsync(int id, DateTime horaInicio)
    {
        var ruta = await _db.RutasVendedor.FindAsync(id);
        if (ruta == null || (ruta.Estado != EstadoRuta.Planificada && ruta.Estado != EstadoRuta.CargaAceptada)) return false;

        ruta.Estado = EstadoRuta.EnProgreso;
        ruta.HoraInicioReal = horaInicio;
        ruta.ActualizadoEn = DateTime.UtcNow;

        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<bool> CompletarRutaAsync(int id, DateTime horaFin, double? kilometrosReales)
    {
        var ruta = await _db.RutasVendedor.FindAsync(id);
        if (ruta == null || ruta.Estado != EstadoRuta.EnProgreso) return false;

        ruta.Estado = EstadoRuta.Completada;
        ruta.HoraFinReal = horaFin;
        ruta.KilometrosReales = kilometrosReales;
        ruta.ActualizadoEn = DateTime.UtcNow;

        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<bool> CancelarRutaAsync(int id, string? motivo)
    {
        var ruta = await _db.RutasVendedor.FindAsync(id);
        if (ruta == null) return false;

        ruta.Estado = EstadoRuta.Cancelada;
        ruta.Notas = string.IsNullOrEmpty(ruta.Notas)
            ? $"[Cancelada] {motivo}"
            : $"{ruta.Notas}\n[Cancelada] {motivo}";
        ruta.ActualizadoEn = DateTime.UtcNow;

        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<int> AgregarDetalleAsync(RutaDetalle detalle)
    {
        _db.RutasDetalle.Add(detalle);
        await _db.SaveChangesAsync();
        return detalle.Id;
    }

    public async Task<bool> ActualizarDetalleAsync(RutaDetalle detalle)
    {
        _db.RutasDetalle.Update(detalle);
        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<bool> EliminarDetalleAsync(int detalleId)
    {
        var detalle = await _db.RutasDetalle.FindAsync(detalleId);
        if (detalle == null) return false;

        _db.RutasDetalle.Remove(detalle);
        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<RutaDetalle?> ObtenerDetalleAsync(int detalleId)
    {
        return await _db.RutasDetalle
            .AsNoTracking()
            .Include(d => d.Cliente)
            .FirstOrDefaultAsync(d => d.Id == detalleId);
    }

    public async Task<bool> ReordenarDetallesAsync(int rutaId, List<int> ordenDetalleIds)
    {
        var detalles = await _db.RutasDetalle
            .Where(d => d.RutaId == rutaId)
            .ToListAsync();

        for (int i = 0; i < ordenDetalleIds.Count; i++)
        {
            var detalle = detalles.FirstOrDefault(d => d.Id == ordenDetalleIds[i]);
            if (detalle != null)
            {
                detalle.OrdenVisita = i + 1;
            }
        }

        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<bool> LlegarAParadaAsync(int detalleId, DateTime horaLlegada, double latitud, double longitud)
    {
        var detalle = await _db.RutasDetalle.FindAsync(detalleId);
        if (detalle == null || detalle.Estado != EstadoParada.Pendiente && detalle.Estado != EstadoParada.EnCamino)
            return false;

        detalle.Estado = EstadoParada.Visitado;
        detalle.HoraLlegadaReal = horaLlegada;
        detalle.Latitud = latitud;
        detalle.Longitud = longitud;
        detalle.ActualizadoEn = DateTime.UtcNow;

        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<bool> SalirDeParadaAsync(int detalleId, DateTime horaSalida, int? visitaId, int? pedidoId, string? notas)
    {
        var detalle = await _db.RutasDetalle.FindAsync(detalleId);
        if (detalle == null) return false;

        detalle.HoraSalidaReal = horaSalida;
        detalle.VisitaId = visitaId;
        detalle.PedidoId = pedidoId;
        if (!string.IsNullOrEmpty(notas))
        {
            detalle.Notas = string.IsNullOrEmpty(detalle.Notas) ? notas : $"{detalle.Notas}\n{notas}";
        }
        detalle.ActualizadoEn = DateTime.UtcNow;

        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<bool> OmitirParadaAsync(int detalleId, string razonOmision)
    {
        var detalle = await _db.RutasDetalle.FindAsync(detalleId);
        if (detalle == null) return false;

        detalle.Estado = EstadoParada.Omitido;
        detalle.RazonOmision = razonOmision;
        detalle.ActualizadoEn = DateTime.UtcNow;

        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<RutaDetalleDto?> ObtenerParadaActualAsync(int rutaId)
    {
        var detalle = await _db.RutasDetalle
            .AsNoTracking()
            .Include(d => d.Cliente)
            .Where(d => d.RutaId == rutaId && d.Estado == EstadoParada.Visitado && d.HoraSalidaReal == null)
            .OrderBy(d => d.OrdenVisita)
            .FirstOrDefaultAsync();

        return detalle != null ? MapDetalleToDto(detalle) : null;
    }

    public async Task<RutaDetalleDto?> ObtenerSiguienteParadaAsync(int rutaId)
    {
        var detalle = await _db.RutasDetalle
            .AsNoTracking()
            .Include(d => d.Cliente)
            .Where(d => d.RutaId == rutaId && (d.Estado == EstadoParada.Pendiente || d.Estado == EstadoParada.EnCamino))
            .OrderBy(d => d.OrdenVisita)
            .FirstOrDefaultAsync();

        return detalle != null ? MapDetalleToDto(detalle) : null;
    }

    public async Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId)
    {
        var ruta = await _db.RutasVendedor.FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);
        if (ruta == null) return false;
        ruta.Activo = activo;
        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId)
    {
        var rutas = await _db.RutasVendedor
            .Where(r => ids.Contains(r.Id) && r.TenantId == tenantId)
            .ToListAsync();
        foreach (var r in rutas) r.Activo = activo;
        await _db.SaveChangesAsync();
        return rutas.Count;
    }

    // === Carga de inventario ===

    public async Task<List<RutaCargaDto>> ObtenerCargaAsync(int rutaId, int tenantId)
    {
        return await _db.RutasCarga
            .AsNoTracking()
            .Include(c => c.Producto)
            .Where(c => c.RutaId == rutaId && c.TenantId == tenantId && c.Activo)
            .Select(c => new RutaCargaDto
            {
                Id = c.Id,
                ProductoId = c.ProductoId,
                ProductoNombre = c.Producto.Nombre,
                ProductoSku = c.Producto.CodigoBarra,
                CantidadEntrega = c.CantidadEntrega,
                CantidadVenta = c.CantidadVenta,
                CantidadTotal = c.CantidadTotal,
                PrecioUnitario = c.PrecioUnitario,
                Disponible = _db.Inventarios
                    .Where(i => i.ProductoId == c.ProductoId && i.TenantId == tenantId)
                    .Select(i => (int?)i.CantidadActual)
                    .FirstOrDefault()
            })
            .ToListAsync();
    }

    public async Task AsignarProductoVentaAsync(int rutaId, int productoId, int cantidad, double precio, int tenantId)
    {
        var existente = await _db.RutasCarga
            .FirstOrDefaultAsync(c => c.RutaId == rutaId && c.ProductoId == productoId && c.TenantId == tenantId && c.Activo);

        if (existente != null)
        {
            existente.CantidadVenta = cantidad;
            existente.PrecioUnitario = precio > 0 ? precio : existente.PrecioUnitario;
            existente.CantidadTotal = existente.CantidadEntrega + cantidad;
            existente.ActualizadoEn = DateTime.UtcNow;
        }
        else
        {
            _db.RutasCarga.Add(new RutaCarga
            {
                RutaId = rutaId,
                ProductoId = productoId,
                TenantId = tenantId,
                CantidadVenta = cantidad,
                CantidadEntrega = 0,
                CantidadTotal = cantidad,
                PrecioUnitario = precio,
                CreadoEn = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task RemoverProductoCargaAsync(int rutaId, int productoId, int tenantId)
    {
        var carga = await _db.RutasCarga
            .FirstOrDefaultAsync(c => c.RutaId == rutaId && c.ProductoId == productoId && c.TenantId == tenantId && c.Activo);

        if (carga != null)
        {
            carga.Activo = false;
            carga.ActualizadoEn = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<List<RutaPedidoAsignadoDto>> ObtenerPedidosAsignadosAsync(int rutaId, int tenantId)
    {
        return await _db.RutasPedidos
            .AsNoTracking()
            .Include(rp => rp.Pedido)
                .ThenInclude(p => p.Cliente)
            .Where(rp => rp.RutaId == rutaId && rp.TenantId == tenantId && rp.Activo)
            .Select(rp => new RutaPedidoAsignadoDto
            {
                Id = rp.Id,
                PedidoId = rp.PedidoId,
                ClienteNombre = rp.Pedido.Cliente.Nombre,
                FechaPedido = rp.Pedido.FechaPedido,
                MontoTotal = (double)rp.Pedido.Total,
                TotalProductos = rp.Pedido.Detalles.Count,
                Estado = (int)rp.Estado,
                EstadoNombre = rp.Estado.ToString()
            })
            .ToListAsync();
    }

    public async Task AsignarPedidoAsync(int rutaId, int pedidoId, int tenantId)
    {
        var existe = await _db.RutasPedidos
            .AnyAsync(rp => rp.RutaId == rutaId && rp.PedidoId == pedidoId && rp.TenantId == tenantId && rp.Activo);

        if (existe) return;

        _db.RutasPedidos.Add(new RutaPedido
        {
            RutaId = rutaId,
            PedidoId = pedidoId,
            TenantId = tenantId,
            Estado = EstadoPedidoRuta.Asignado,
            CreadoEn = DateTime.UtcNow
        });

        // Agregar productos del pedido a la carga (como entrega)
        var detallesPedido = await _db.DetallePedidos
            .Where(d => d.PedidoId == pedidoId)
            .ToListAsync();

        foreach (var det in detallesPedido)
        {
            var cargaExistente = await _db.RutasCarga
                .FirstOrDefaultAsync(c => c.RutaId == rutaId && c.ProductoId == det.ProductoId && c.TenantId == tenantId && c.Activo);

            if (cargaExistente != null)
            {
                cargaExistente.CantidadEntrega += (int)det.Cantidad;
                cargaExistente.CantidadTotal = cargaExistente.CantidadEntrega + cargaExistente.CantidadVenta;
                if (cargaExistente.PrecioUnitario == 0)
                    cargaExistente.PrecioUnitario = (double)det.PrecioUnitario;
                cargaExistente.ActualizadoEn = DateTime.UtcNow;
            }
            else
            {
                _db.RutasCarga.Add(new RutaCarga
                {
                    RutaId = rutaId,
                    ProductoId = det.ProductoId,
                    TenantId = tenantId,
                    CantidadEntrega = (int)det.Cantidad,
                    CantidadVenta = 0,
                    CantidadTotal = (int)det.Cantidad,
                    PrecioUnitario = (double)det.PrecioUnitario,
                    CreadoEn = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
    }

    public async Task RemoverPedidoAsync(int rutaId, int pedidoId, int tenantId)
    {
        var rp = await _db.RutasPedidos
            .FirstOrDefaultAsync(x => x.RutaId == rutaId && x.PedidoId == pedidoId && x.TenantId == tenantId && x.Activo);

        if (rp != null)
        {
            rp.Activo = false;
            rp.ActualizadoEn = DateTime.UtcNow;

            // Restar productos del pedido de la carga
            var detallesPedido = await _db.DetallePedidos
                .Where(d => d.PedidoId == pedidoId)
                .ToListAsync();

            foreach (var det in detallesPedido)
            {
                var carga = await _db.RutasCarga
                    .FirstOrDefaultAsync(c => c.RutaId == rutaId && c.ProductoId == det.ProductoId && c.TenantId == tenantId && c.Activo);

                if (carga != null)
                {
                    carga.CantidadEntrega = Math.Max(0, carga.CantidadEntrega - (int)det.Cantidad);
                    carga.CantidadTotal = carga.CantidadEntrega + carga.CantidadVenta;
                    carga.ActualizadoEn = DateTime.UtcNow;

                    if (carga.CantidadTotal == 0)
                    {
                        carga.Activo = false;
                    }
                }
            }

            await _db.SaveChangesAsync();
        }
    }

    public async Task ActualizarEfectivoInicialAsync(int rutaId, double monto, string? comentarios, int tenantId)
    {
        var ruta = await _db.RutasVendedor
            .FirstOrDefaultAsync(r => r.Id == rutaId && r.TenantId == tenantId);

        if (ruta != null)
        {
            ruta.EfectivoInicial = monto;
            ruta.ComentariosCarga = comentarios;
            ruta.ActualizadoEn = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task EnviarACargaAsync(int rutaId, int tenantId)
    {
        var ruta = await _db.RutasVendedor
            .FirstOrDefaultAsync(r => r.Id == rutaId && r.TenantId == tenantId);

        if (ruta != null)
        {
            ruta.Estado = EstadoRuta.PendienteAceptar;
            ruta.ActualizadoEn = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    // === Cierre de ruta ===

    public async Task<CierreRutaResumenDto> ObtenerResumenCierreAsync(int rutaId, int tenantId)
    {
        var ruta = await _db.RutasVendedor
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == rutaId && r.TenantId == tenantId);

        if (ruta == null) return new CierreRutaResumenDto();

        // Calculate valor de la ruta (total carga)
        var valorRuta = await _db.RutasCarga
            .AsNoTracking()
            .Where(c => c.RutaId == rutaId && c.TenantId == tenantId && c.Activo)
            .SumAsync(c => c.CantidadTotal * c.PrecioUnitario);

        // For now return basic structure - real calculations will use pedidos/ventas data
        var resumen = new CierreRutaResumenDto
        {
            ValorRuta = valorRuta,
            EfectivoInicial = ruta.EfectivoInicial ?? 0,
            Recibido = ruta.MontoRecibido
        };

        // Calculate ARecibir = EfectivoEntrante - Movimientos + EfectivoInicial
        resumen.ARecibir = resumen.VentasContado + resumen.EntregasCobradas + resumen.CobranzaAdeudos + resumen.EfectivoInicial;
        resumen.Diferencia = resumen.Recibido.HasValue ? resumen.Recibido.Value - resumen.ARecibir : null;

        return resumen;
    }

    public async Task<List<RutaRetornoItemDto>> ObtenerRetornoInventarioAsync(int rutaId, int tenantId)
    {
        // Check if retorno records exist, if not create them from carga
        var existeRetorno = await _db.RutasRetornoInventario
            .AnyAsync(r => r.RutaId == rutaId && r.TenantId == tenantId && r.Activo);

        if (!existeRetorno)
        {
            // Generate retorno from carga data
            var cargas = await _db.RutasCarga
                .Where(c => c.RutaId == rutaId && c.TenantId == tenantId && c.Activo)
                .ToListAsync();

            foreach (var carga in cargas)
            {
                _db.RutasRetornoInventario.Add(new RutaRetornoInventario
                {
                    RutaId = rutaId,
                    ProductoId = carga.ProductoId,
                    TenantId = tenantId,
                    CantidadInicial = carga.CantidadTotal,
                    VentasMonto = 0,
                    CreadoEn = DateTime.UtcNow
                });
            }

            if (cargas.Any())
                await _db.SaveChangesAsync();
        }

        return await _db.RutasRetornoInventario
            .Include(r => r.Producto)
            .Where(r => r.RutaId == rutaId && r.TenantId == tenantId && r.Activo)
            .Select(r => new RutaRetornoItemDto
            {
                Id = r.Id,
                ProductoId = r.ProductoId,
                ProductoNombre = r.Producto.Nombre,
                ProductoSku = r.Producto.CodigoBarra,
                VentasMonto = r.VentasMonto,
                CantidadInicial = r.CantidadInicial,
                Vendidos = r.Vendidos,
                Entregados = r.Entregados,
                Devueltos = r.Devueltos,
                Mermas = r.Mermas,
                RecAlmacen = r.RecAlmacen,
                CargaVehiculo = r.CargaVehiculo,
                Diferencia = r.CantidadInicial - r.Vendidos - r.Entregados - r.Devueltos - r.Mermas - r.RecAlmacen - r.CargaVehiculo
            })
            .ToListAsync();
    }

    public async Task ActualizarRetornoAsync(int rutaId, int productoId, int mermas, int recAlmacen, int cargaVehiculo, int tenantId)
    {
        var retorno = await _db.RutasRetornoInventario
            .FirstOrDefaultAsync(r => r.RutaId == rutaId && r.ProductoId == productoId && r.TenantId == tenantId && r.Activo);

        if (retorno != null)
        {
            retorno.Mermas = mermas;
            retorno.RecAlmacen = recAlmacen;
            retorno.CargaVehiculo = cargaVehiculo;
            retorno.Diferencia = retorno.CantidadInicial - retorno.Vendidos - retorno.Entregados - retorno.Devueltos - mermas - recAlmacen - cargaVehiculo;
            retorno.ActualizadoEn = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task CerrarRutaAsync(int rutaId, double montoRecibido, string cerradoPor, int tenantId)
    {
        var ruta = await _db.RutasVendedor
            .FirstOrDefaultAsync(r => r.Id == rutaId && r.TenantId == tenantId);

        if (ruta != null)
        {
            ruta.Estado = EstadoRuta.Cerrada;
            ruta.MontoRecibido = montoRecibido;
            ruta.CerradoEn = DateTime.UtcNow;
            ruta.CerradoPor = cerradoPor;
            ruta.ActualizadoEn = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    private RutaVendedorDto MapToDto(RutaVendedor ruta)
    {
        return new RutaVendedorDto
        {
            Id = ruta.Id,
            UsuarioId = ruta.UsuarioId,
            UsuarioNombre = ruta.Usuario?.Nombre ?? "",
            ZonaId = ruta.ZonaId,
            ZonaNombre = ruta.Zona?.Nombre,
            Nombre = ruta.Nombre,
            Descripcion = ruta.Descripcion,
            Fecha = ruta.Fecha,
            HoraInicioEstimada = ruta.HoraInicioEstimada,
            HoraFinEstimada = ruta.HoraFinEstimada,
            HoraInicioReal = ruta.HoraInicioReal,
            HoraFinReal = ruta.HoraFinReal,
            Estado = ruta.Estado,
            KilometrosEstimados = ruta.KilometrosEstimados,
            KilometrosReales = ruta.KilometrosReales,
            Notas = ruta.Notas,
            EfectivoInicial = ruta.EfectivoInicial,
            ComentariosCarga = ruta.ComentariosCarga,
            MontoRecibido = ruta.MontoRecibido,
            TotalParadas = ruta.Detalles.Count,
            ParadasCompletadas = ruta.Detalles.Count(d => d.Estado == EstadoParada.Visitado),
            ParadasPendientes = ruta.Detalles.Count(d => d.Estado == EstadoParada.Pendiente || d.Estado == EstadoParada.EnCamino),
            Detalles = ruta.Detalles.OrderBy(d => d.OrdenVisita).Select(MapDetalleToDto).ToList(),
            CreadoEn = ruta.CreadoEn
        };
    }

    private RutaDetalleDto MapDetalleToDto(RutaDetalle detalle)
    {
        return new RutaDetalleDto
        {
            Id = detalle.Id,
            RutaId = detalle.RutaId,
            ClienteId = detalle.ClienteId,
            ClienteNombre = detalle.Cliente?.Nombre ?? "",
            ClienteDireccion = detalle.Cliente?.Direccion,
            ClienteLatitud = detalle.Cliente?.Latitud,
            ClienteLongitud = detalle.Cliente?.Longitud,
            OrdenVisita = detalle.OrdenVisita,
            HoraEstimadaLlegada = detalle.HoraEstimadaLlegada,
            DuracionEstimadaMinutos = detalle.DuracionEstimadaMinutos,
            HoraLlegadaReal = detalle.HoraLlegadaReal,
            HoraSalidaReal = detalle.HoraSalidaReal,
            Estado = detalle.Estado,
            VisitaId = detalle.VisitaId,
            PedidoId = detalle.PedidoId,
            Notas = detalle.Notas,
            RazonOmision = detalle.RazonOmision,
            DistanciaDesdeAnterior = detalle.DistanciaDesdeAnterior
        };
    }
}
