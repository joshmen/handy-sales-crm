using HandySuites.Application.Common;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HandySuites.Infrastructure.Repositories.Pedidos;

public class PedidoRepository : IPedidoRepository
{
    private readonly HandySuitesDbContext _db;
    private readonly ITenantTimeZoneService _tenantTz;
    private readonly ILogger<PedidoRepository>? _logger;

    public PedidoRepository(HandySuitesDbContext db, ITenantTimeZoneService tenantTz, ILogger<PedidoRepository>? logger = null)
    {
        _db = db;
        _tenantTz = tenantTz;
        _logger = logger;
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

        // Resolver tasas: las referenciadas por productos + la default del tenant.
        var (tasas, defaultTasa) = await LoadTasasAsync(productos.Values, tenantId);

        // Resolver promociones BOGO referenciadas por las líneas (tipo Regalo activas).
        // Solo cargamos las explícitamente referenciadas por el cliente — el server
        // valida vigencia y elegibilidad antes de aplicar.
        var promocionIds = dto.Detalles
            .Where(d => d.PromocionId.HasValue)
            .Select(d => d.PromocionId!.Value)
            .Distinct()
            .ToList();
        var promociones = promocionIds.Count > 0
            ? await _db.Promociones
                .Include(p => p.PromocionProductos)
                .Where(p => promocionIds.Contains(p.Id) && p.TenantId == tenantId)
                .ToDictionaryAsync(p => p.Id)
            : new Dictionary<int, Promocion>();

        // Cargar productos bonificados (FK distinto al producto comprado) para que
        // ResolveBogo pueda armar la línea Y sin un round-trip por cada item.
        var bonificadoIds = promociones.Values
            .Where(p => p.ProductoBonificadoId.HasValue)
            .Select(p => p.ProductoBonificadoId!.Value)
            .Distinct()
            .Where(id => !productos.ContainsKey(id))
            .ToList();
        if (bonificadoIds.Count > 0)
        {
            var bonificados = await _db.Productos
                .Where(p => bonificadoIds.Contains(p.Id))
                .ToListAsync();
            foreach (var b in bonificados) productos[b.Id] = b;

            // Refrescar tasas para incluir las del producto bonificado.
            (tasas, defaultTasa) = await LoadTasasAsync(productos.Values, tenantId);
        }

        // Productos a auto-insertar como líneas Y (regalo de producto distinto).
        var lineasBonificacionDistinta = new List<DetallePedido>();
        var ahora = DateTime.UtcNow;
        // Vigencia BOGO: campos date-only (Promocion.FechaInicio/FechaFin) se guardan
        // a medianoche UTC del día calendario. Comparar contra UtcNow invalidaba una
        // promo vigente HOY al cruzar medianoche UTC (en vez del fin de día del tenant
        // MX UTC-6). Usamos medianoche UTC del día tenant "hoy" para la comparación.
        var ahoraBogo = await _tenantTz.GetTenantTodayMidnightUtcAsync();

        // Agregar detalles
        foreach (var detalleDto in dto.Detalles)
        {
            if (!productos.TryGetValue(detalleDto.ProductoId, out var producto)) continue;

            var precioUnitario = detalleDto.PrecioUnitario ?? producto.PrecioBase;
            var descuento = detalleDto.Descuento ?? 0;
            var tasa = ResolveTasa(producto, tasas, defaultTasa);

            // Resolver promoción Regalo (BOGO) — recalcular en server, no confiar en cliente.
            // Se pasa ahoraBogo (medianoche UTC del día tenant) para la validación de
            // vigencia; los timestamps de las líneas siguen usando `ahora` (UtcNow real).
            var (cantidadBonificada, lineaY) = ResolveBogo(
                detalleDto, producto, promociones, productos, tasas, defaultTasa, pedido.Id, ahora, ahoraBogo);

            // Caso mismo producto: descuento equivale al valor de las unidades regaladas.
            // Caso producto distinto: la línea X mantiene cantidadBonificada=0; el regalo
            // se materializa en `lineaY` que se insertará al final.
            if (cantidadBonificada > 0 && lineaY == null)
            {
                descuento = precioUnitario * cantidadBonificada;
            }

            var amounts = LineAmountCalculator.Calculate(
                precioUnitario, detalleDto.Cantidad, descuento, tasa, producto.PrecioIncluyeIva);

            var detalle = new DetallePedido
            {
                PedidoId = pedido.Id,
                ProductoId = detalleDto.ProductoId,
                Cantidad = detalleDto.Cantidad,
                PrecioUnitario = precioUnitario,
                // Snapshot del costo actual del producto al momento de la venta (COGS/margen histórico).
                CostoUnitario = producto.Costo,
                Descuento = descuento,
                PorcentajeDescuento = detalleDto.PorcentajeDescuento ?? 0,
                Subtotal = amounts.Subtotal,
                Impuesto = amounts.Impuesto,
                Total = amounts.Total,
                Notas = detalleDto.Notas,
                CantidadBonificada = lineaY == null ? cantidadBonificada : 0m,
                Activo = true,
                CreadoEn = ahora
            };

            _db.DetallePedidos.Add(detalle);

            if (lineaY != null) lineasBonificacionDistinta.Add(lineaY);
        }

        // Auto-insertar líneas Y (producto bonificado distinto). Cada una entra con
        // descuento 100% y CantidadBonificada == Cantidad para que el CFDI sepa.
        foreach (var lineaY in lineasBonificacionDistinta)
            _db.DetallePedidos.Add(lineaY);

        await _db.SaveChangesAsync();

        // Recalcular totales del pedido
        await RecalcularTotalesAsync(pedido.Id);

        return pedido.Id;
    }

    public async Task<PedidoEagerSaveOutcome> EagerSaveAsync(PedidoEagerSaveDto dto, int usuarioId, int tenantId)
    {
        // Idempotency: si ya existe Pedido con este (mobile_record_id, tenant_id),
        // retornar el existente SIN tocar nada. Aplicable después de un retry del
        // cliente o si la red drop entre push y ack.
        if (!string.IsNullOrWhiteSpace(dto.MobileRecordId))
        {
            var existing = await _db.Pedidos
                .AsNoTracking()
                .Where(p => p.MobileRecordId == dto.MobileRecordId && p.TenantId == tenantId)
                .Select(p => new { p.Id, p.Estado, p.CreadoEn })
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                return new PedidoEagerSaveOutcome(
                    ServerId: existing.Id,
                    Estado: existing.Estado,
                    AckedAt: existing.CreadoEn,
                    Idempotent: true);
            }
        }

        var ahora = DateTime.UtcNow;

        // Anti-doble-venta directa (incidente prod 2026-06-23). El móvil puede
        // crear DOS ventas directas para la misma transacción (doble-submit), cada
        // una con su propio mobile_record_id → la idempotencia por mrid no las
        // colapsa. Si ya existe una VentaDirecta reciente con la MISMA huella
        // (tenant+vendedor+cliente+total), devolvemos esa (idempotente) en vez de
        // crear otra. Ver VentaDirectaPolicy.DedupeWindowSeconds.
        if ((TipoVenta)dto.TipoVenta == TipoVenta.VentaDirecta && dto.Total > 0)
        {
            var ventana = ahora.AddSeconds(-VentaDirectaPolicy.DedupeWindowSeconds);
            var dupReciente = await _db.Pedidos
                .AsNoTracking()
                .Where(p => p.TenantId == tenantId
                         && p.UsuarioId == usuarioId
                         && p.ClienteId == dto.ClienteId
                         && p.TipoVenta == TipoVenta.VentaDirecta
                         && p.MobileRecordId != dto.MobileRecordId
                         && p.Total == dto.Total
                         && p.CreadoEn >= ventana)
                .OrderByDescending(p => p.CreadoEn)
                .Select(p => new { p.Id, p.Estado, p.CreadoEn })
                .FirstOrDefaultAsync();

            if (dupReciente != null)
            {
                _logger?.LogWarning(
                    "Eager-save: venta directa duplicada (tenant={Tenant} vendedor={Usuario} cliente={Cliente} total={Total} mrid={Mrid}) colapsada a Pedido {Existente}",
                    tenantId, usuarioId, dto.ClienteId, dto.Total, dto.MobileRecordId, dupReciente.Id);
                return new PedidoEagerSaveOutcome(
                    ServerId: dupReciente.Id,
                    Estado: dupReciente.Estado,
                    AckedAt: dupReciente.CreadoEn,
                    Idempotent: true);
            }
        }

        // NumeroPedido es NOT NULL en el schema. Generamos uno real (mismo flow que
        // CrearAsync) — el retry loop maneja race condition con UNIQUE constraint.
        // Prefix "PED" porque eager-save siempre es Borrador (preventa style); el flow
        // sync push posterior puede actualizar el número si es VentaDirecta.
        string numeroPedido = string.Empty;
        for (int numAttempt = 0; numAttempt < 3; numAttempt++)
        {
            try
            {
                numeroPedido = await GenerarNumeroPedidoAsync(tenantId, "PED");
                break;
            }
            catch (DbUpdateException) when (numAttempt < 2)
            {
                // retry
            }
        }
        if (string.IsNullOrEmpty(numeroPedido))
        {
            throw new InvalidOperationException("No se pudo generar NumeroPedido único después de 3 intentos");
        }

        var pedido = new Pedido
        {
            TenantId = tenantId,
            ClienteId = dto.ClienteId,
            UsuarioId = usuarioId,
            NumeroPedido = numeroPedido,
            FechaPedido = dto.FechaPedido != default ? dto.FechaPedido : ahora,
            // SIEMPRE Borrador en eager-save. La promoción a Entregado/Confirmado
            // (y el correspondiente decrement de inventario en VentaDirecta + el
            // RutasCarga side-effect) pasa por el flow de sync push normal cuando
            // el cliente finaliza el pedido.
            Estado = EstadoPedido.Borrador,
            TipoVenta = (TipoVenta)dto.TipoVenta,
            Subtotal = dto.Subtotal,
            Descuento = dto.Descuento,
            Impuestos = dto.Impuesto,
            Total = dto.Total,
            Notas = dto.Notas,
            Latitud = dto.Latitud,
            Longitud = dto.Longitud,
            MobileRecordId = dto.MobileRecordId,
            Activo = true,
            CreadoEn = ahora
        };

        _db.Pedidos.Add(pedido);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pg && pg.SqlState == "23505")
        {
            // Race condition: 2 requests concurrentes con el mismo mobile_record_id
            // (cliente que reintenta antes de recibir ack). El primero gana, el
            // segundo recupera el existente y retorna idempotente.
            _db.Entry(pedido).State = EntityState.Detached;

            var existing = await _db.Pedidos
                .AsNoTracking()
                .Where(p => p.MobileRecordId == dto.MobileRecordId && p.TenantId == tenantId)
                .Select(p => new { p.Id, p.Estado, p.CreadoEn })
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                return new PedidoEagerSaveOutcome(
                    ServerId: existing.Id,
                    Estado: existing.Estado,
                    AckedAt: existing.CreadoEn,
                    Idempotent: true);
            }

            throw;
        }

        // Insertar detalles (montos pre-calculados client-side, NO se recalcula BOGO).
        foreach (var detalleDto in dto.Detalles)
        {
            _db.DetallePedidos.Add(new DetallePedido
            {
                PedidoId = pedido.Id,
                // mrid del detalle (WDB local id) — clave de idempotencia para que el
                // sync push reconcilie esta misma fila por mrid en vez de borrar+recrear
                // (anti duplicado del ticket mobile). Ver SyncRepository.UpsertPedidoAsync.
                MobileRecordId = detalleDto.MobileRecordId,
                ProductoId = detalleDto.ProductoId,
                Cantidad = detalleDto.Cantidad,
                PrecioUnitario = detalleDto.PrecioUnitario,
                Descuento = detalleDto.Descuento,
                PorcentajeDescuento = 0,
                Subtotal = detalleDto.Subtotal,
                Impuesto = detalleDto.Impuesto,
                Total = detalleDto.Total,
                CantidadBonificada = 0m,
                Activo = true,
                CreadoEn = ahora
            });
        }

        if (dto.Detalles.Count > 0)
        {
            await _db.SaveChangesAsync();
        }

        return new PedidoEagerSaveOutcome(
            ServerId: pedido.Id,
            Estado: EstadoPedido.Borrador,
            AckedAt: ahora,
            Idempotent: false);
    }

    public async Task<List<OrphanDraftDto>> GetOrphanDraftsAsync(DateTime cutoffDate, int tenantId, int? usuarioId = null)
    {
        // C.1 — Drafts huérfanos: Pedidos en Estado=Borrador hace >= N min.
        // Join con Usuarios + Clientes para devolver nombres legibles. Sin
        // pagination — el dashboard típicamente muestra todos los huérfanos
        // del tenant (raramente > 50 en estado normal).
        var query = _db.Pedidos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId
                     && p.Estado == EstadoPedido.Borrador
                     && p.CreadoEn <= cutoffDate
                     && p.Activo);

        if (usuarioId.HasValue)
        {
            query = query.Where(p => p.UsuarioId == usuarioId.Value);
        }

        var raw = await query
            .Join(_db.Usuarios.IgnoreQueryFilters(),
                p => p.UsuarioId, u => u.Id, (p, u) => new { p, u })
            .Join(_db.Clientes.IgnoreQueryFilters(),
                x => x.p.ClienteId, c => c.Id, (x, c) => new
                {
                    PedidoId = x.p.Id,
                    NumeroPedido = x.p.NumeroPedido,
                    MobileRecordId = x.p.MobileRecordId ?? string.Empty,
                    UsuarioId = x.p.UsuarioId,
                    UsuarioNombre = x.u.Nombre,
                    ClienteId = x.p.ClienteId,
                    ClienteNombre = c.Nombre,
                    Total = x.p.Total,
                    FechaPedido = x.p.FechaPedido,
                    CreadoEn = x.p.CreadoEn,
                    DetallesCount = _db.DetallePedidos.Count(d => d.PedidoId == x.p.Id),
                })
            .OrderByDescending(x => x.CreadoEn)
            .ToListAsync();

        var now = DateTime.UtcNow;
        return raw.Select(r => new OrphanDraftDto(
            r.PedidoId,
            r.NumeroPedido,
            r.MobileRecordId,
            r.UsuarioId,
            r.UsuarioNombre,
            r.ClienteId,
            r.ClienteNombre,
            r.Total,
            r.FechaPedido,
            r.CreadoEn,
            MinutesSinceCreated: (int)(now - r.CreadoEn).TotalMinutes,
            r.DetallesCount
        )).ToList();
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

        // Excluir pedidos ya asignados a cualquier ruta activa (Planificada,
        // PendienteAceptar, CargaAceptada, EnProgreso). Sin esto, el modal
        // de "Asignar pedidos a ruta" mostraba pedidos que ya estaban tomados
        // por otra ruta (reportado 2026-04-27).
        if (filtro.ExcluirAsignadosARutas == true)
        {
            query = query.Where(p => !_db.Set<RutaPedido>()
                .Any(rp => rp.PedidoId == p.Id
                        && rp.Activo
                        && rp.TenantId == tenantId
                        && rp.Ruta != null
                        && (rp.Ruta.Estado == EstadoRuta.Planificada
                         || rp.Ruta.Estado == EstadoRuta.PendienteAceptar
                         || rp.Ruta.Estado == EstadoRuta.CargaAceptada
                         || rp.Ruta.Estado == EstadoRuta.EnProgreso)));
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

            var (tasas, defaultTasa) = await LoadTasasAsync(productos.Values, tenantId);

            // Agregar nuevos detalles
            foreach (var detalleDto in dto.Detalles)
            {
                if (!productos.TryGetValue(detalleDto.ProductoId, out var producto)) continue;

                var precioUnitario = detalleDto.PrecioUnitario ?? producto.PrecioBase;
                var descuento = detalleDto.Descuento ?? 0;
                var tasa = ResolveTasa(producto, tasas, defaultTasa);
                var amounts = LineAmountCalculator.Calculate(
                    precioUnitario, detalleDto.Cantidad, descuento, tasa, producto.PrecioIncluyeIva);

                var detalle = new DetallePedido
                {
                    PedidoId = pedido.Id,
                    ProductoId = detalleDto.ProductoId,
                    Cantidad = detalleDto.Cantidad,
                    PrecioUnitario = precioUnitario,
                    CostoUnitario = producto.Costo,
                    Descuento = descuento,
                    PorcentajeDescuento = detalleDto.PorcentajeDescuento ?? 0,
                    Subtotal = amounts.Subtotal,
                    Impuesto = amounts.Impuesto,
                    Total = amounts.Total,
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
        var result = await CambiarEstadoDetalladoAsync(id, nuevoEstado, notas, tenantId);
        return result.Status == CambiarEstadoStatus.Ok;
    }

    public async Task<CambiarEstadoOutcome> CambiarEstadoDetalladoAsync(int id, EstadoPedido nuevoEstado, string? notas, int tenantId)
    {
        var pedido = await _db.Pedidos
            .FirstOrDefaultAsync(p => p.Id == id && p.TenantId == tenantId && p.Activo);

        if (pedido == null) return new CambiarEstadoOutcome(CambiarEstadoStatus.NotFound, null);

        if (!EsTransicionValida(pedido.Estado, nuevoEstado))
            return new CambiarEstadoOutcome(CambiarEstadoStatus.TransicionInvalida, pedido.Estado);

        // BR-RUTA-EnRuta: para que un pedido pase a EnRuta debe estar asignado a una RutaVendedor
        // cuyo estado sea CargaAceptada o EnProgreso. Antes web permitía pasar Confirmado→EnRuta sin
        // RutaVendedor planificada, dejando el pedido "en ruta" fantasma sin asignación a un viaje real
        // (reportado en staging 2026-04-27). Solo aplica al cambio explícito a EnRuta — otros cambios
        // de estado (Entregado, Cancelado) no deben re-validar la ruta.
        if (nuevoEstado == EstadoPedido.EnRuta)
        {
            var hasActiveRoute = await (from rp in _db.RutasPedidos
                                        join rv in _db.RutasVendedor.IgnoreQueryFilters()
                                            on rp.RutaId equals rv.Id
                                        where rp.PedidoId == id
                                              && rp.TenantId == tenantId
                                              && rp.Activo
                                              && rv.TenantId == tenantId
                                              && rv.EliminadoEn == null
                                              && (rv.Estado == EstadoRuta.CargaAceptada
                                                  || rv.Estado == EstadoRuta.EnProgreso)
                                        select rv.Id).AnyAsync();
            if (!hasActiveRoute)
                return new CambiarEstadoOutcome(CambiarEstadoStatus.SinRutaActiva, pedido.Estado);
        }

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

            // BR-RUTA-CARGA: incrementar RutasCarga.CantidadVendida (VentaDirecta) o
            // CantidadEntregada (Preventa) por cada detalle del pedido. Replica el
            // mismo comportamiento que tienen los endpoints mobile directos
            // (MobileVentaDirectaEndpoints, MobilePedidoEndpoints) y el path de
            // sync push (SyncRepository.UpsertPedidoAsync). Sin esto, cuando un
            // admin o supervisor marca un pedido como Entregado desde web, la
            // barra "Productos (vendidos + entregados)" en mobile se queda en 0
            // (reportado prod 2026-05-26 — Rodrigo). Idempotente porque
            // EsTransicionValida solo permite EnRuta→Entregado.
            await IncrementarRutaCargaPorPedidoEntregadoAsync(pedido, tenantId);
        }

        await _db.SaveChangesAsync();
        return new CambiarEstadoOutcome(CambiarEstadoStatus.Ok, nuevoEstado);
    }

    /// <summary>
    /// Suma las cantidades de los detalles del pedido al RutasCarga correspondiente
    /// del producto en la ruta donde el pedido viaja. Si el pedido no está ligado a
    /// una ruta y no es VentaDirecta, no-op (no debería pasar para Entregado válido).
    /// </summary>
    private async Task IncrementarRutaCargaPorPedidoEntregadoAsync(Pedido pedido, int tenantId)
    {
        var detalles = await _db.DetallePedidos.AsNoTracking()
            .Where(d => d.PedidoId == pedido.Id && d.Activo)
            .Select(d => new { d.ProductoId, d.Cantidad })
            .ToListAsync();
        if (detalles.Count == 0) return;

        // Caso 1: Pedido con RutasPedidos pre-link (preventa o venta directa asignada a ruta)
        var rutaId = await _db.RutasPedidos.AsNoTracking()
            .Where(rp => rp.PedidoId == pedido.Id && rp.TenantId == tenantId && rp.Activo)
            .Select(rp => (int?)rp.RutaId)
            .FirstOrDefaultAsync();

        // Caso 2: VentaDirecta sin pre-link — buscar ruta activa del vendedor del MISMO DÍA
        // del pedido. Antes (pre-fix bug Rodrigo 27/5/2026) la búsqueda no acotaba por fecha,
        // por lo que pedidos del día X entregados tarde podían imputarse a la ruta del día Y
        // que estuviera activa en ese momento — cross-contamination silencioso entre rutas.
        // Mismo filtro que `SyncRepository.UpsertPedidoAsync` post-fix 0d9a4e13.
        if (!rutaId.HasValue && pedido.TipoVenta == TipoVenta.VentaDirecta)
        {
            // FECHA-CALENDARIO DEL TENANT, no UTC. pedido.FechaPedido es un instante real;
            // .Date daba el día UTC, por lo que una venta de la tarde/noche en México (UTC-6)
            // caía al día UTC siguiente y NO encontraba la ruta de hoy -> CantidadVendida no se
            // incrementaba (el cierre subcontaba "Vendió"). r.Fecha es date-only (guardado a
            // medianoche UTC) -> se matchea con la window de día-calendario, igual que el lookup
            // de rutas por fecha en RutaVendedorRepository.
            var diaTenant = await _tenantTz.GetTenantDayFromUtcAsync(pedido.FechaPedido);
            var (fechaInicio, fechaFin) = _tenantTz.GetCalendarDayWindowUtc(diaTenant);
            var query = _db.RutasVendedor.AsNoTracking()
                .Where(r => r.UsuarioId == pedido.UsuarioId
                         && r.TenantId == tenantId
                         && r.Activo
                         && r.Fecha >= fechaInicio && r.Fecha < fechaFin
                         && (r.Estado == EstadoRuta.EnProgreso || r.Estado == EstadoRuta.CargaAceptada));
            // 2026-06-09 cross-DB: PG nativo, SQLite ternary explicito
            var isPostgres = _db.Database.ProviderName?.Contains("Npgsql") == true;
            var ordered = isPostgres
                ? query.OrderByDescending(r => r.HoraInicioReal ?? r.AceptadaEn ?? r.Fecha)
                : query.OrderByDescending(r =>
                    r.HoraInicioReal.HasValue ? r.HoraInicioReal.Value
                    : r.AceptadaEn.HasValue ? r.AceptadaEn.Value
                    : r.Fecha);
            rutaId = await ordered
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync();
        }

        if (!rutaId.HasValue) return;

        foreach (var det in detalles)
        {
            var carga = await _db.RutasCarga
                .FirstOrDefaultAsync(c => c.RutaId == rutaId.Value
                    && c.ProductoId == det.ProductoId
                    && c.TenantId == tenantId
                    && c.Activo);
            if (carga == null) continue;

            if (pedido.TipoVenta == TipoVenta.VentaDirecta)
                carga.CantidadVendida += (int)det.Cantidad;
            else
                carga.CantidadEntregada += (int)det.Cantidad;
            carga.ActualizadoEn = DateTime.UtcNow;
        }
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
        var (tasas, defaultTasa) = await LoadTasasAsync(new[] { producto }, tenantId);
        var tasa = ResolveTasa(producto, tasas, defaultTasa);
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario, dto.Cantidad, descuento, tasa, producto.PrecioIncluyeIva);

        var detalle = new DetallePedido
        {
            PedidoId = pedidoId,
            ProductoId = dto.ProductoId,
            Cantidad = dto.Cantidad,
            PrecioUnitario = precioUnitario,
            CostoUnitario = producto.Costo,
            Descuento = descuento,
            PorcentajeDescuento = dto.PorcentajeDescuento ?? 0,
            Subtotal = amounts.Subtotal,
            Impuesto = amounts.Impuesto,
            Total = amounts.Total,
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
        var (tasas, defaultTasa) = await LoadTasasAsync(new[] { producto }, tenantId);
        var tasa = ResolveTasa(producto, tasas, defaultTasa);
        var amounts = LineAmountCalculator.Calculate(
            precioUnitario, dto.Cantidad, descuento, tasa, producto.PrecioIncluyeIva);

        detalle.ProductoId = dto.ProductoId;
        detalle.Cantidad = dto.Cantidad;
        detalle.PrecioUnitario = precioUnitario;
        detalle.CostoUnitario = producto.Costo;
        detalle.Descuento = descuento;
        detalle.PorcentajeDescuento = dto.PorcentajeDescuento ?? 0;
        detalle.Subtotal = amounts.Subtotal;
        detalle.Impuesto = amounts.Impuesto;
        detalle.Total = amounts.Total;
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

    public Task<bool> ClienteActivoAsync(int clienteId, int tenantId)
        => _db.Clientes.AsNoTracking()
            .AnyAsync(c => c.Id == clienteId && c.TenantId == tenantId && c.Activo);

    public Task<bool> ProductoActivoAsync(int productoId, int tenantId)
        => _db.Productos.AsNoTracking()
            .AnyAsync(p => p.Id == productoId && p.TenantId == tenantId && p.Activo);

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

    // ── Tasas de impuesto helpers ─────────────────────────────────────
    // Resuelve la tasa aplicable a un producto con fallback al default tenant.
    // Si el tenant no tiene tasa default configurada (no debería ocurrir post-migration
    // que sembró IVA 16% per tenant), usa 0.16 como último fallback.

    private async Task<(Dictionary<int, decimal> Tasas, decimal DefaultTasa)> LoadTasasAsync(
        IEnumerable<Producto> productos, int tenantId)
    {
        var tasaIds = productos.Where(p => p.TasaImpuestoId.HasValue)
                               .Select(p => p.TasaImpuestoId!.Value)
                               .Distinct()
                               .ToList();

        var tasas = tasaIds.Count == 0
            ? new Dictionary<int, decimal>()
            : await _db.TasasImpuesto
                .Where(t => tasaIds.Contains(t.Id) && t.Activo)
                .ToDictionaryAsync(t => t.Id, t => t.Tasa);

        var defaultTasa = await _db.TasasImpuesto
            .Where(t => t.TenantId == tenantId && t.EsDefault && t.Activo)
            .Select(t => (decimal?)t.Tasa)
            .FirstOrDefaultAsync() ?? 0.16m;

        return (tasas, defaultTasa);
    }

    private static decimal ResolveTasa(Producto producto, Dictionary<int, decimal> tasas, decimal defaultTasa)
    {
        if (producto.TasaImpuestoId.HasValue && tasas.TryGetValue(producto.TasaImpuestoId.Value, out var t))
            return t;
        return defaultTasa;
    }

    /// <summary>
    /// Resuelve la bonificación BOGO para una línea usando <see cref="BogoCalculator"/>
    /// (pure function) y construye la línea Y si el regalo es producto distinto.
    /// </summary>
    private (decimal cantidadBonificada, DetallePedido? lineaY) ResolveBogo(
        DetallePedidoCreateDto detalleDto,
        Producto producto,
        Dictionary<int, Promocion> promociones,
        Dictionary<int, Producto> productos,
        Dictionary<int, decimal> tasas,
        decimal defaultTasa,
        int pedidoId,
        DateTime ahora,
        DateTime ahoraBogo)
    {
        if (!detalleDto.PromocionId.HasValue) return (0m, null);
        if (!promociones.TryGetValue(detalleDto.PromocionId.Value, out var promo)) return (0m, null);

        var bogo = BogoCalculator.Calculate(detalleDto.Cantidad, promo, producto.Id, ahoraBogo);
        if (bogo.CantidadBonificada == 0m) return (0m, null);

        // Mismo producto → descuento equivalente en la línea X.
        if (!bogo.ProductoBonificadoId.HasValue) return (bogo.CantidadBonificada, null);

        // Producto distinto → línea Y separada con descuento 100%.
        if (!productos.TryGetValue(bogo.ProductoBonificadoId.Value, out var productoY))
            return (0m, null); // producto bonificado no existe → silencio seguro

        var precioY = productoY.PrecioBase;
        var tasaY = ResolveTasa(productoY, tasas, defaultTasa);
        var descuentoY = precioY * bogo.CantidadBonificada;
        var amountsY = LineAmountCalculator.Calculate(precioY, bogo.CantidadBonificada, descuentoY, tasaY, productoY.PrecioIncluyeIva);

        var lineaY = new DetallePedido
        {
            PedidoId = pedidoId,
            ProductoId = productoY.Id,
            Cantidad = bogo.CantidadBonificada,
            PrecioUnitario = precioY,
            CostoUnitario = productoY.Costo,
            Descuento = descuentoY,
            PorcentajeDescuento = 0,
            Subtotal = amountsY.Subtotal,
            Impuesto = amountsY.Impuesto,
            Total = amountsY.Total,
            Notas = $"Regalo por promoción: {promo.Nombre}",
            CantidadBonificada = bogo.CantidadBonificada,
            Activo = true,
            CreadoEn = ahora
        };

        return (0m, lineaY);
    }
}
