using HandySuites.Application.Sync.DTOs;
using HandySuites.Application.Sync.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Sync;

public class SyncRepository : ISyncRepository
{
    private readonly HandySuitesDbContext _db;

    public SyncRepository(HandySuitesDbContext db)
    {
        _db = db;
    }

    public async Task<List<Cliente>> GetClientesModifiedSinceAsync(int tenantId, DateTime? since)
    {
        var query = _db.Clientes.AsNoTracking().Where(c => c.TenantId == tenantId);

        if (since.HasValue)
        {
            query = query.Where(c => c.ActualizadoEn > since || c.CreadoEn > since);
        }

        return await query.OrderBy(c => c.Id).ToListAsync();
    }

    public async Task<List<Producto>> GetProductosModifiedSinceAsync(int tenantId, DateTime? since)
    {
        var query = _db.Productos.AsNoTracking().Where(p => p.TenantId == tenantId);

        if (since.HasValue)
        {
            query = query.Where(p => p.ActualizadoEn > since || p.CreadoEn > since);
        }

        return await query.OrderBy(p => p.Id).ToListAsync();
    }

    public async Task<Dictionary<int, (decimal cantidad, decimal minimo)>> GetStockMapAsync(int tenantId)
    {
        return await _db.Set<HandySuites.Domain.Entities.Inventario>()
            .AsNoTracking()
            .Where(i => i.TenantId == tenantId)
            .ToDictionaryAsync(
                i => i.ProductoId,
                i => (i.CantidadActual, i.StockMinimo));
    }

    public async Task<List<Pedido>> GetPedidosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since)
    {
        var query = _db.Pedidos
            .AsNoTracking()
            .Include(p => p.Detalles)
                .ThenInclude(d => d.Producto)
            .Where(p => p.TenantId == tenantId && p.UsuarioId == usuarioId);

        if (since.HasValue)
        {
            query = query.Where(p => p.ActualizadoEn > since || p.CreadoEn > since);
        }

        return await query.OrderBy(p => p.Id).ToListAsync();
    }

    public async Task<List<ClienteVisita>> GetVisitasModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since)
    {
        var query = _db.ClienteVisitas
            .AsNoTracking()
            .Where(v => v.TenantId == tenantId && v.UsuarioId == usuarioId);

        if (since.HasValue)
        {
            query = query.Where(v => v.ActualizadoEn > since || v.CreadoEn > since);
        }

        return await query.OrderBy(v => v.Id).ToListAsync();
    }

    public async Task<List<RutaVendedor>> GetRutasModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since)
    {
        var query = _db.RutasVendedor
            .AsNoTracking()
            .Include(r => r.Detalles)
            .Where(r => r.TenantId == tenantId
                     && r.UsuarioId.HasValue && r.UsuarioId.Value == usuarioId
                     && !r.EsTemplate);

        if (since.HasValue)
        {
            query = query.Where(r => r.ActualizadoEn > since || r.CreadoEn > since);
        }

        return await query.OrderBy(r => r.Id).ToListAsync();
    }

    public async Task<(Cliente entity, bool wasConflict)> UpsertClienteAsync(int tenantId, SyncClienteDto dto, string userId)
    {
        bool wasConflict = false;

        if (dto.Operation == SyncOperation.Delete)
        {
            var existing = await _db.Clientes.FindAsync(dto.Id);
            if (existing == null || existing.TenantId != tenantId)
            {
                throw new InvalidOperationException($"Cliente with id {dto.Id} not found or unauthorized");
            }
            existing.Activo = false;
            existing.ActualizadoEn = DateTime.UtcNow;
            existing.ActualizadoPor = userId;
            existing.Version++;
            return (existing, wasConflict);
        }

        if (dto.Id > 0)
        {
            // Update existing
            var existing = await _db.Clientes.FindAsync(dto.Id);
            if (existing != null && existing.TenantId == tenantId)
            {
                // Check for version conflict
                if (existing.Version != dto.Version)
                {
                    wasConflict = true;
                    // Server wins - return current server state
                    return (existing, wasConflict);
                }

                existing.Nombre = dto.Nombre;
                existing.RFC = dto.RFC;
                existing.Correo = dto.Correo;
                existing.Telefono = dto.Telefono;
                existing.Direccion = dto.Direccion;
                // Dirección desglosada (Cliente field gap fix — antes se perdían en update)
                existing.NumeroExterior = dto.NumeroExterior;
                existing.Colonia = dto.Colonia;
                existing.Ciudad = dto.Ciudad;
                existing.CodigoPostal = dto.CodigoPostal;
                existing.Encargado = dto.Encargado;
                existing.IdZona = dto.IdZona;
                existing.CategoriaClienteId = dto.CategoriaClienteId;
                existing.ListaPreciosId = dto.ListaPreciosId;
                existing.Latitud = dto.Latitud;
                existing.Longitud = dto.Longitud;
                // Comerciales
                existing.LimiteCredito = dto.LimiteCredito;
                existing.DiasCredito = dto.DiasCredito;
                existing.Descuento = dto.Descuento;
                existing.Saldo = dto.Saldo;
                existing.VentaMinimaEfectiva = dto.VentaMinimaEfectiva;
                // Reglas de pago
                existing.TiposPagoPermitidos = dto.TiposPagoPermitidos;
                existing.TipoPagoPredeterminado = dto.TipoPagoPredeterminado;
                existing.Comentarios = dto.Comentarios;
                // Datos fiscales
                existing.RfcFiscal = dto.RfcFiscal;
                existing.RazonSocial = dto.RazonSocial;
                existing.RegimenFiscal = dto.RegimenFiscal;
                existing.UsoCFDIPredeterminado = dto.UsoCfdi;
                existing.CodigoPostalFiscal = dto.CpFiscal;
                existing.Facturable = dto.RequiereFactura;
                existing.Activo = dto.Activo;
                existing.ActualizadoEn = DateTime.UtcNow;
                existing.ActualizadoPor = userId;
                existing.Version++;

                return (existing, wasConflict);
            }
        }

        // Dedupe offline-created records by MobileRecordId so retries don't duplicate
        if (!string.IsNullOrEmpty(dto.LocalId))
        {
            var byMobile = await _db.Clientes
                .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.MobileRecordId == dto.LocalId);
            if (byMobile != null)
            {
                return (byMobile, wasConflict);
            }
        }

        int? vendedorId = int.TryParse(userId, out var uid) ? uid : (int?)null;

        // Create new
        var cliente = new Cliente
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            RFC = dto.RFC,
            Correo = dto.Correo,
            Telefono = dto.Telefono,
            Direccion = dto.Direccion,
            // Dirección desglosada (Cliente field gap fix — antes se perdían en create)
            NumeroExterior = dto.NumeroExterior,
            Colonia = dto.Colonia,
            Ciudad = dto.Ciudad,
            CodigoPostal = dto.CodigoPostal,
            Encargado = dto.Encargado,
            IdZona = dto.IdZona,
            CategoriaClienteId = dto.CategoriaClienteId,
            VendedorId = vendedorId,
            ListaPreciosId = dto.ListaPreciosId,
            Latitud = dto.Latitud,
            Longitud = dto.Longitud,
            // Comerciales
            LimiteCredito = dto.LimiteCredito,
            DiasCredito = dto.DiasCredito,
            Descuento = dto.Descuento,
            Saldo = dto.Saldo,
            VentaMinimaEfectiva = dto.VentaMinimaEfectiva,
            // Reglas de pago
            TiposPagoPermitidos = dto.TiposPagoPermitidos,
            TipoPagoPredeterminado = dto.TipoPagoPredeterminado,
            Comentarios = dto.Comentarios,
            // Datos fiscales
            RfcFiscal = dto.RfcFiscal,
            RazonSocial = dto.RazonSocial,
            RegimenFiscal = dto.RegimenFiscal,
            UsoCFDIPredeterminado = dto.UsoCfdi,
            CodigoPostalFiscal = dto.CpFiscal,
            Facturable = dto.RequiereFactura,
            Activo = dto.Activo,
            MobileRecordId = dto.LocalId,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = userId,
            Version = 1
        };

        _db.Clientes.Add(cliente);
        return (cliente, wasConflict);
    }

    public async Task<(Pedido entity, bool wasConflict)> UpsertPedidoAsync(int tenantId, int usuarioId, SyncPedidoDto dto, string userId)
    {
        bool wasConflict = false;

        if (dto.Operation == SyncOperation.Delete)
        {
            var existing = await _db.Pedidos.FindAsync(dto.Id);
            if (existing == null || existing.TenantId != tenantId)
            {
                throw new InvalidOperationException($"Pedido with id {dto.Id} not found or unauthorized");
            }
            existing.Activo = false;
            existing.ActualizadoEn = DateTime.UtcNow;
            existing.ActualizadoPor = userId;
            existing.Version++;
            return (existing, wasConflict);
        }

        if (dto.Id > 0)
        {
            // Update existing
            var existing = await _db.Pedidos
                .Include(p => p.Detalles)
                .FirstOrDefaultAsync(p => p.Id == dto.Id && p.TenantId == tenantId);

            if (existing != null)
            {
                // Check for version conflict
                if (existing.Version != dto.Version)
                {
                    wasConflict = true;
                    return (existing, wasConflict);
                }

                existing.FechaEntregaEstimada = dto.FechaEntregaEstimada;
                existing.Estado = (EstadoPedido)dto.Estado;
                existing.TipoVenta = (TipoVenta)dto.TipoVenta;
                existing.Notas = dto.Notas;
                existing.DireccionEntrega = dto.DireccionEntrega;
                existing.Latitud = dto.Latitud;
                existing.Longitud = dto.Longitud;
                existing.ActualizadoEn = DateTime.UtcNow;
                existing.ActualizadoPor = userId;
                existing.Version++;

                // Update detalles if provided
                if (dto.Detalles != null)
                {
                    // Remove existing detalles
                    _db.DetallePedidos.RemoveRange(existing.Detalles);

                    // Look up server-side prices for all products in this order
                    var productoIds = dto.Detalles.Select(d => d.ProductoId).Distinct().ToList();
                    var serverPrices = await _db.Productos
                        .AsNoTracking()
                        .Where(p => productoIds.Contains(p.Id) && p.TenantId == tenantId)
                        .ToDictionaryAsync(p => p.Id, p => p.PrecioBase);

                    // Add new detalles with server-validated prices
                    foreach (var detalleDto in dto.Detalles)
                    {
                        var serverPrice = serverPrices.GetValueOrDefault(detalleDto.ProductoId, detalleDto.PrecioUnitario);
                        var lineSubtotal = serverPrice * detalleDto.Cantidad;
                        var lineDescuento = detalleDto.Descuento;
                        var lineImpuesto = (lineSubtotal - lineDescuento) * 0.16m;
                        var lineTotal = lineSubtotal - lineDescuento + lineImpuesto;

                        var detalle = new DetallePedido
                        {
                            PedidoId = existing.Id,
                            MobileRecordId = detalleDto.LocalId,
                            ProductoId = detalleDto.ProductoId,
                            Cantidad = detalleDto.Cantidad,
                            PrecioUnitario = serverPrice,
                            Descuento = lineDescuento,
                            PorcentajeDescuento = detalleDto.PorcentajeDescuento,
                            Subtotal = lineSubtotal,
                            Impuesto = lineImpuesto,
                            Total = lineTotal,
                            Notas = detalleDto.Notas,
                            CreadoEn = DateTime.UtcNow,
                            CreadoPor = userId,
                            Version = 1
                        };
                        _db.DetallePedidos.Add(detalle);
                    }

                    // Recalculate totals from server-validated detalles
                    var updatedDetalles = _db.ChangeTracker.Entries<DetallePedido>()
                        .Where(e => e.State == EntityState.Added && e.Entity.PedidoId == existing.Id)
                        .Select(e => e.Entity).ToList();
                    existing.Subtotal = updatedDetalles.Sum(d => d.Subtotal);
                    existing.Descuento = updatedDetalles.Sum(d => d.Descuento);
                    existing.Impuestos = updatedDetalles.Sum(d => d.Impuesto);
                    existing.Total = updatedDetalles.Sum(d => d.Total);
                }

                return (existing, wasConflict);
            }
        }

        // Idempotency: if this mobile_record_id was already pushed, return existing
        if (!string.IsNullOrEmpty(dto.LocalId))
        {
            var existingByMobileId = await _db.Pedidos
                .Include(p => p.Detalles)
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.MobileRecordId == dto.LocalId);
            if (existingByMobileId != null)
            {
                return (existingByMobileId, false);
            }
        }

        // Create new pedido — look up server-side prices first
        var newProductoIds = dto.Detalles?.Select(d => d.ProductoId).Distinct().ToList() ?? new List<int>();
        var newServerPrices = newProductoIds.Count > 0
            ? await _db.Productos.AsNoTracking()
                .Where(p => newProductoIds.Contains(p.Id) && p.TenantId == tenantId)
                .ToDictionaryAsync(p => p.Id, p => p.PrecioBase)
            : new Dictionary<int, decimal>();

        // Build detalles with server-validated prices to compute correct totals
        var newDetalles = new List<DetallePedido>();
        if (dto.Detalles != null)
        {
            foreach (var detalleDto in dto.Detalles)
            {
                var serverPrice = newServerPrices.GetValueOrDefault(detalleDto.ProductoId, detalleDto.PrecioUnitario);
                var lineSubtotal = serverPrice * detalleDto.Cantidad;
                var lineDescuento = detalleDto.Descuento;
                var lineImpuesto = (lineSubtotal - lineDescuento) * 0.16m;
                var lineTotal = lineSubtotal - lineDescuento + lineImpuesto;

                newDetalles.Add(new DetallePedido
                {
                    MobileRecordId = detalleDto.LocalId,
                    ProductoId = detalleDto.ProductoId,
                    Cantidad = detalleDto.Cantidad,
                    PrecioUnitario = serverPrice,
                    Descuento = lineDescuento,
                    PorcentajeDescuento = detalleDto.PorcentajeDescuento,
                    Subtotal = lineSubtotal,
                    Impuesto = lineImpuesto,
                    Total = lineTotal,
                    Notas = detalleDto.Notas,
                    CreadoEn = DateTime.UtcNow,
                    CreadoPor = userId,
                    Version = 1
                });
            }
        }

        // Retry loop for order number race condition (duplicate key 23505)
        const int maxRetries = 3;
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            var numeroPedido = dto.NumeroPedido ?? await GenerarNumeroPedidoAsync(tenantId);
            var pedido = new Pedido
            {
                TenantId = tenantId,
                MobileRecordId = dto.LocalId,
                UsuarioId = usuarioId,
                ClienteId = dto.ClienteId,
                NumeroPedido = numeroPedido,
                FechaPedido = dto.FechaPedido,
                FechaEntregaEstimada = dto.FechaEntregaEstimada,
                Estado = (EstadoPedido)dto.Estado,
                TipoVenta = (TipoVenta)dto.TipoVenta,
                Subtotal = newDetalles.Sum(d => d.Subtotal),
                Descuento = newDetalles.Sum(d => d.Descuento),
                Impuestos = newDetalles.Sum(d => d.Impuesto),
                Total = newDetalles.Sum(d => d.Total),
                Notas = dto.Notas,
                DireccionEntrega = dto.DireccionEntrega,
                Latitud = dto.Latitud,
                Longitud = dto.Longitud,
                ListaPrecioId = dto.ListaPrecioId,
                CreadoEn = DateTime.UtcNow,
                CreadoPor = userId,
                Version = 1
            };

            try
            {
                _db.Pedidos.Add(pedido);
                await _db.SaveChangesAsync(); // Save to get the ID

                // Add detalles with pedido ID
                foreach (var detalle in newDetalles)
                {
                    detalle.PedidoId = pedido.Id;
                    _db.DetallePedidos.Add(detalle);
                }

                // BR-VD-INV: Para VentaDirecta Entregada, decrementar inventario en la misma
                // transacción — análogo a lo que hace PedidoService.CrearAsync con
                // MovimientoInventarioService.CrearMovimientoAsync. Evita stock fantasma
                // cuando un vendedor cierra ventas directas offline.
                if (pedido.TipoVenta == TipoVenta.VentaDirecta && pedido.Estado == EstadoPedido.Entregado)
                {
                    foreach (var detalle in newDetalles)
                    {
                        var inv = await _db.Inventarios
                            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.ProductoId == detalle.ProductoId);
                        if (inv == null) continue; // producto sin inventario — no bloquear la venta
                        var anterior = inv.CantidadActual;
                        var nueva = anterior - detalle.Cantidad;
                        inv.CantidadActual = nueva;
                        inv.ActualizadoEn = DateTime.UtcNow;
                        inv.ActualizadoPor = userId;
                        _db.MovimientosInventario.Add(new MovimientoInventario
                        {
                            TenantId = tenantId,
                            ProductoId = detalle.ProductoId,
                            TipoMovimiento = "SALIDA",
                            Cantidad = detalle.Cantidad,
                            CantidadAnterior = anterior,
                            CantidadNueva = nueva,
                            Motivo = "VENTA",
                            Comentario = $"Venta directa mobile - Pedido #{pedido.Id}",
                            UsuarioId = usuarioId,
                            ReferenciaId = pedido.Id,
                            ReferenciaTipo = "PEDIDO",
                            CreadoEn = DateTime.UtcNow,
                            CreadoPor = userId,
                            Version = 1
                        });
                    }
                }

                return (pedido, wasConflict);
            }
            catch (DbUpdateException ex) when (
                ex.InnerException is Npgsql.PostgresException pg && pg.SqlState == "23505"
                && attempt < maxRetries - 1)
            {
                // Duplicate order number — clear tracker and retry with new number
                _db.ChangeTracker.Clear();
            }
        }

        throw new InvalidOperationException("No se pudo generar un número de pedido único después de varios intentos.");
    }

    public async Task<(ClienteVisita entity, bool wasConflict)> UpsertVisitaAsync(int tenantId, int usuarioId, SyncVisitaDto dto, string userId)
    {
        bool wasConflict = false;

        if (dto.Operation == SyncOperation.Delete)
        {
            var existing = await _db.ClienteVisitas.FindAsync(dto.Id);
            if (existing == null || existing.TenantId != tenantId)
            {
                throw new InvalidOperationException($"ClienteVisita with id {dto.Id} not found or unauthorized");
            }
            existing.Activo = false;
            existing.ActualizadoEn = DateTime.UtcNow;
            existing.ActualizadoPor = userId;
            existing.Version++;
            return (existing, wasConflict);
        }

        if (dto.Id > 0)
        {
            // Update existing
            var existing = await _db.ClienteVisitas.FindAsync(dto.Id);
            if (existing != null && existing.TenantId == tenantId)
            {
                // Check for version conflict
                if (existing.Version != dto.Version)
                {
                    wasConflict = true;
                    return (existing, wasConflict);
                }

                existing.FechaHoraInicio = dto.FechaHoraInicio;
                existing.FechaHoraFin = dto.FechaHoraFin;
                existing.LatitudInicio = dto.LatitudInicio;
                existing.LongitudInicio = dto.LongitudInicio;
                existing.LatitudFin = dto.LatitudFin;
                existing.LongitudFin = dto.LongitudFin;
                existing.TipoVisita = (TipoVisita)dto.Estado; // Using TipoVisita instead of Estado
                existing.Notas = dto.Notas;
                existing.PedidoId = dto.PedidoId;
                existing.Resultado = Enum.TryParse<ResultadoVisita>(dto.Resultado, out var resultadoParsed) ? resultadoParsed : ResultadoVisita.Pendiente;
                existing.Fotos = dto.Fotos;
                existing.ActualizadoEn = DateTime.UtcNow;
                existing.ActualizadoPor = userId;
                existing.Version++;

                return (existing, wasConflict);
            }
        }

        // Create new visita
        var visita = new ClienteVisita
        {
            TenantId = tenantId,
            MobileRecordId = dto.LocalId,
            UsuarioId = usuarioId,
            ClienteId = dto.ClienteId,
            FechaProgramada = dto.FechaProgramada,
            FechaHoraInicio = dto.FechaHoraInicio,
            FechaHoraFin = dto.FechaHoraFin,
            LatitudInicio = dto.LatitudInicio,
            LongitudInicio = dto.LongitudInicio,
            LatitudFin = dto.LatitudFin,
            LongitudFin = dto.LongitudFin,
            TipoVisita = (TipoVisita)dto.Estado, // Using TipoVisita instead of Estado
            Notas = dto.Notas,
            PedidoId = dto.PedidoId,
            Resultado = Enum.TryParse<ResultadoVisita>(dto.Resultado, out var resultado) ? resultado : ResultadoVisita.Pendiente,
            Fotos = dto.Fotos,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = userId,
            Version = 1
        };

        _db.ClienteVisitas.Add(visita);
        return (visita, wasConflict);
    }

    public async Task<(RutaVendedor entity, bool wasConflict)> UpsertRutaAsync(int tenantId, int usuarioId, SyncRutaDto dto, string userId)
    {
        bool wasConflict = false;

        // Rutas can only be updated by the assigned vendor, not created or deleted via sync
        if (dto.Id > 0 && dto.Operation == SyncOperation.Update)
        {
            var existing = await _db.RutasVendedor
                .Include(r => r.Detalles)
                .FirstOrDefaultAsync(r => r.Id == dto.Id && r.TenantId == tenantId && r.UsuarioId == usuarioId);

            if (existing != null)
            {
                // Check for version conflict
                if (existing.Version != dto.Version)
                {
                    wasConflict = true;
                    return (existing, wasConflict);
                }

                // Only allow updating execution-related fields, not planning fields
                existing.HoraInicioReal = dto.HoraInicioReal;
                existing.HoraFinReal = dto.HoraFinReal;
                existing.Estado = (EstadoRuta)dto.Estado;
                existing.KilometrosReales = dto.KilometrosReales;
                existing.Notas = dto.Notas;
                existing.ActualizadoEn = DateTime.UtcNow;
                existing.ActualizadoPor = userId;
                existing.Version++;

                // Update detalles
                if (dto.Detalles != null)
                {
                    foreach (var detalleDto in dto.Detalles)
                    {
                        var existingDetalle = existing.Detalles.FirstOrDefault(d => d.Id == detalleDto.Id);
                        if (existingDetalle != null)
                        {
                            existingDetalle.HoraLlegadaReal = detalleDto.HoraLlegadaReal;
                            existingDetalle.HoraSalidaReal = detalleDto.HoraSalidaReal;
                            existingDetalle.Latitud = detalleDto.LatitudLlegada; // Using Latitud instead of LatitudLlegada
                            existingDetalle.Longitud = detalleDto.LongitudLlegada; // Using Longitud instead of LongitudLlegada
                            existingDetalle.Estado = (EstadoParada)detalleDto.Estado;
                            existingDetalle.RazonOmision = detalleDto.RazonOmision;
                            existingDetalle.VisitaId = detalleDto.VisitaId;
                            existingDetalle.PedidoId = detalleDto.PedidoId;
                            existingDetalle.Notas = detalleDto.Notas;
                            existingDetalle.ActualizadoEn = DateTime.UtcNow;
                            existingDetalle.ActualizadoPor = userId;
                            existingDetalle.Version++;
                        }
                    }
                }

                return (existing, wasConflict);
            }
        }

        // Routes can only be updated via sync, not created or deleted
        throw new InvalidOperationException($"RutaVendedor sync only supports Update operation. Id: {dto.Id}, Operation: {dto.Operation}");
    }

    public async Task<bool> UpsertRutaDetalleAsync(int tenantId, int usuarioId, SyncRutaDetalleDto dto)
    {
        if (dto.Id <= 0) return false;

        var existing = await _db.RutasDetalle
            .Include(d => d.Ruta)
            .FirstOrDefaultAsync(d => d.Id == dto.Id
                && d.Ruta != null
                && d.Ruta.TenantId == tenantId
                && d.Ruta.UsuarioId == usuarioId);

        if (existing == null) return false;

        // Normalizar estado desde timestamps: mobile y backend tienen enums
        // divergentes en el valor 1 (mobile=EnVisita, backend=EnCamino). Si hay
        // HoraSalidaReal el estado efectivo es Visitado (a menos que sea
        // Omitido). Previene paradas con horaSalida set pero estado inconsistente.
        var clientEstado = (EstadoParada)dto.Estado;
        if (clientEstado == EstadoParada.Omitido)
            existing.Estado = EstadoParada.Omitido;
        else if (dto.HoraSalidaReal.HasValue)
            existing.Estado = EstadoParada.Visitado;
        else
            existing.Estado = clientEstado;

        existing.RazonOmision = dto.RazonOmision;
        existing.HoraLlegadaReal = dto.HoraLlegadaReal;
        existing.HoraSalidaReal = dto.HoraSalidaReal;
        existing.Latitud = dto.LatitudLlegada;
        existing.Longitud = dto.LongitudLlegada;
        existing.VisitaId = dto.VisitaId;
        existing.PedidoId = dto.PedidoId;
        if (!string.IsNullOrEmpty(dto.Notas))
            existing.Notas = dto.Notas;
        existing.ActualizadoEn = DateTime.UtcNow;

        return await _db.SaveChangesAsync() > 0;
    }

    public async Task<List<Cobro>> GetCobrosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since)
    {
        var query = _db.Cobros
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.UsuarioId == usuarioId);

        if (since.HasValue)
        {
            query = query.Where(c => c.ActualizadoEn > since || c.CreadoEn > since);
        }

        return await query.OrderBy(c => c.Id).ToListAsync();
    }

    // === Pricing catalog pulls (read-only on mobile) ===

    public async Task<List<SyncPrecioPorProductoDto>> GetPreciosPorProductoAsync(int tenantId, DateTime? since)
    {
        var query = _db.PreciosPorProducto.AsNoTracking().Where(p => p.TenantId == tenantId);
        if (since.HasValue)
            query = query.Where(p => p.ActualizadoEn > since || p.CreadoEn > since);

        return await query.Select(p => new SyncPrecioPorProductoDto
        {
            Id = p.Id,
            ProductoId = p.ProductoId,
            ListaPrecioId = p.ListaPrecioId,
            Precio = p.Precio,
            Activo = p.Activo,
            ActualizadoEn = p.ActualizadoEn,
        }).OrderBy(p => p.Id).ToListAsync();
    }

    public async Task<List<SyncDescuentoDto>> GetDescuentosAsync(int tenantId, DateTime? since)
    {
        var query = _db.DescuentosPorCantidad.AsNoTracking().Where(d => d.TenantId == tenantId);
        if (since.HasValue)
            query = query.Where(d => d.ActualizadoEn > since || d.CreadoEn > since);

        return await query.Select(d => new SyncDescuentoDto
        {
            Id = d.Id,
            ProductoId = d.ProductoId,
            CantidadMinima = d.CantidadMinima,
            DescuentoPorcentaje = d.DescuentoPorcentaje,
            TipoAplicacion = d.TipoAplicacion,
            Activo = d.Activo,
            ActualizadoEn = d.ActualizadoEn,
        }).OrderBy(d => d.Id).ToListAsync();
    }

    public async Task<List<SyncPromocionDto>> GetPromocionesAsync(int tenantId, DateTime? since)
    {
        var query = _db.Promociones.AsNoTracking()
            .Include(p => p.PromocionProductos)
            .Where(p => p.TenantId == tenantId && p.Activo && p.FechaFin >= DateTime.UtcNow);

        if (since.HasValue)
            query = query.Where(p => p.ActualizadoEn > since || p.CreadoEn > since);

        return await query.Select(p => new SyncPromocionDto
        {
            Id = p.Id,
            Nombre = p.Nombre,
            DescuentoPorcentaje = p.DescuentoPorcentaje,
            FechaInicio = p.FechaInicio,
            FechaFin = p.FechaFin,
            ProductoIds = p.PromocionProductos.Select(pp => pp.ProductoId).ToList(),
            Activo = p.Activo,
            ActualizadoEn = p.ActualizadoEn,
        }).OrderBy(p => p.Id).ToListAsync();
    }

    public async Task<(Cobro entity, bool wasConflict)> UpsertCobroAsync(int tenantId, int usuarioId, SyncCobroDto dto, string userId)
    {
        bool wasConflict = false;

        if (dto.Operation == SyncOperation.Delete)
        {
            var existing = await _db.Cobros.FindAsync(dto.Id);
            if (existing == null || existing.TenantId != tenantId)
            {
                throw new InvalidOperationException($"Cobro with id {dto.Id} not found or unauthorized");
            }
            existing.Activo = false;
            existing.ActualizadoEn = DateTime.UtcNow;
            existing.ActualizadoPor = userId;
            existing.Version++;
            return (existing, wasConflict);
        }

        if (dto.Id > 0)
        {
            var existing = await _db.Cobros.FindAsync(dto.Id);
            if (existing != null && existing.TenantId == tenantId)
            {
                if (existing.Version != dto.Version)
                {
                    wasConflict = true;
                    return (existing, wasConflict);
                }

                // Validate monto on update
                if (dto.Monto <= 0)
                    throw new InvalidOperationException("El monto del cobro debe ser mayor a cero.");

                if (existing.Monto != dto.Monto && existing.PedidoId.HasValue)
                {
                    var pedido = await _db.Pedidos.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.Id == existing.PedidoId.Value && p.TenantId == tenantId);
                    if (pedido != null && dto.Monto > pedido.Total)
                        throw new InvalidOperationException($"El monto ({dto.Monto}) excede el total del pedido ({pedido.Total}).");
                }

                existing.Monto = dto.Monto;
                existing.MetodoPago = (MetodoPago)dto.MetodoPago;
                existing.Referencia = dto.Referencia;
                existing.Notas = dto.Notas;
                existing.Activo = dto.Activo;
                existing.ActualizadoEn = DateTime.UtcNow;
                existing.ActualizadoPor = userId;
                existing.Version++;

                return (existing, wasConflict);
            }
        }

        if (dto.Monto <= 0)
            throw new InvalidOperationException("El monto del cobro debe ser mayor a cero.");

        // Resolver PedidoLocalId (WDB id) → PedidoId cuando el pedido padre fue creado
        // en el mismo sync y aún no tiene ServerId en el cliente. Evita cobros huérfanos
        // con pedido_id NULL en flujo VentaDirecta offline.
        int? resolvedPedidoId = dto.PedidoId;
        if ((!resolvedPedidoId.HasValue || resolvedPedidoId.Value <= 0) && !string.IsNullOrEmpty(dto.PedidoLocalId))
        {
            var parent = await _db.Pedidos.AsNoTracking()
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.MobileRecordId == dto.PedidoLocalId);
            if (parent != null) resolvedPedidoId = parent.Id;
        }

        if (resolvedPedidoId.HasValue && resolvedPedidoId.Value > 0)
        {
            var pedido = await _db.Pedidos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == resolvedPedidoId.Value && p.TenantId == tenantId);
            if (pedido != null && dto.Monto > pedido.Total && pedido.Total > 0)
                throw new InvalidOperationException($"El monto ({dto.Monto}) excede el total del pedido ({pedido.Total}).");
        }

        var cobro = new Cobro
        {
            TenantId = tenantId,
            MobileRecordId = dto.LocalId,
            UsuarioId = usuarioId,
            ClienteId = dto.ClienteId,
            PedidoId = resolvedPedidoId,
            Monto = dto.Monto,
            MetodoPago = (MetodoPago)dto.MetodoPago,
            FechaCobro = dto.FechaCobro != default ? dto.FechaCobro : DateTime.UtcNow,
            Referencia = dto.Referencia,
            Notas = dto.Notas,
            Activo = dto.Activo,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = userId,
            Version = 1
        };

        _db.Cobros.Add(cobro);
        return (cobro, wasConflict);
    }

    public async Task<int> SaveChangesAsync()
    {
        return await _db.SaveChangesAsync();
    }

    private async Task<string> GenerarNumeroPedidoAsync(int tenantId)
    {
        var fecha = DateTime.UtcNow;
        var prefijo = $"PED-{fecha:yyyyMMdd}-";

        var ultimoPedido = await _db.Pedidos
            .Where(p => p.TenantId == tenantId && p.NumeroPedido.StartsWith(prefijo))
            .OrderByDescending(p => p.NumeroPedido)
            .FirstOrDefaultAsync();

        var secuencia = 1;
        if (ultimoPedido != null)
        {
            var partes = ultimoPedido.NumeroPedido.Split('-');
            if (partes.Length > 2 && int.TryParse(partes[2], out var ultimaSecuencia))
            {
                secuencia = ultimaSecuencia + 1;
            }
        }

        return $"{prefijo}{secuencia:D4}";
    }
}
