using HandySales.Application.Sync.DTOs;
using HandySales.Application.Sync.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories.Sync;

public class SyncRepository : ISyncRepository
{
    private readonly HandySalesDbContext _db;

    public SyncRepository(HandySalesDbContext db)
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

    public async Task<List<Pedido>> GetPedidosModifiedSinceAsync(int tenantId, int usuarioId, DateTime? since)
    {
        var query = _db.Pedidos
            .AsNoTracking()
            .Include(p => p.Detalles)
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
            .Where(r => r.TenantId == tenantId && r.UsuarioId == usuarioId);

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
                existing.IdZona = dto.IdZona;
                existing.CategoriaClienteId = dto.CategoriaClienteId;
                existing.Latitud = dto.Latitud;
                existing.Longitud = dto.Longitud;
                existing.Activo = dto.Activo;
                existing.ActualizadoEn = DateTime.UtcNow;
                existing.ActualizadoPor = userId;
                existing.Version++;

                return (existing, wasConflict);
            }
        }

        // Create new
        var cliente = new Cliente
        {
            TenantId = tenantId,
            Nombre = dto.Nombre,
            RFC = dto.RFC,
            Correo = dto.Correo,
            Telefono = dto.Telefono,
            Direccion = dto.Direccion,
            IdZona = dto.IdZona,
            CategoriaClienteId = dto.CategoriaClienteId,
            Latitud = dto.Latitud,
            Longitud = dto.Longitud,
            Activo = dto.Activo,
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

                    // Add new detalles
                    foreach (var detalleDto in dto.Detalles)
                    {
                        var detalle = new DetallePedido
                        {
                            PedidoId = existing.Id,
                            ProductoId = detalleDto.ProductoId,
                            Cantidad = detalleDto.Cantidad,
                            PrecioUnitario = detalleDto.PrecioUnitario,
                            Descuento = detalleDto.Descuento,
                            PorcentajeDescuento = detalleDto.PorcentajeDescuento,
                            Subtotal = detalleDto.Subtotal,
                            Impuesto = detalleDto.Impuesto,
                            Total = detalleDto.Total,
                            Notas = detalleDto.Notas,
                            CreadoEn = DateTime.UtcNow,
                            CreadoPor = userId,
                            Version = 1
                        };
                        _db.DetallePedidos.Add(detalle);
                    }

                    // Recalculate totals
                    existing.Subtotal = dto.Detalles.Sum(d => d.Subtotal);
                    existing.Descuento = dto.Detalles.Sum(d => d.Descuento);
                    existing.Impuestos = dto.Detalles.Sum(d => d.Impuesto);
                    existing.Total = dto.Detalles.Sum(d => d.Total);
                }

                return (existing, wasConflict);
            }
        }

        // Create new pedido
        var numeroPedido = dto.NumeroPedido ?? await GenerarNumeroPedidoAsync(tenantId);
        var pedido = new Pedido
        {
            TenantId = tenantId,
            UsuarioId = usuarioId,
            ClienteId = dto.ClienteId,
            NumeroPedido = numeroPedido,
            FechaPedido = dto.FechaPedido,
            FechaEntregaEstimada = dto.FechaEntregaEstimada,
            Estado = (EstadoPedido)dto.Estado,
            Subtotal = dto.Subtotal,
            Descuento = dto.Descuento,
            Impuestos = dto.Impuestos,
            Total = dto.Total,
            Notas = dto.Notas,
            DireccionEntrega = dto.DireccionEntrega,
            Latitud = dto.Latitud,
            Longitud = dto.Longitud,
            ListaPrecioId = dto.ListaPrecioId,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = userId,
            Version = 1
        };

        _db.Pedidos.Add(pedido);
        await _db.SaveChangesAsync(); // Save to get the ID

        // Add detalles
        if (dto.Detalles != null)
        {
            foreach (var detalleDto in dto.Detalles)
            {
                var detalle = new DetallePedido
                {
                    PedidoId = pedido.Id,
                    ProductoId = detalleDto.ProductoId,
                    Cantidad = detalleDto.Cantidad,
                    PrecioUnitario = detalleDto.PrecioUnitario,
                    Descuento = detalleDto.Descuento,
                    PorcentajeDescuento = detalleDto.PorcentajeDescuento,
                    Subtotal = detalleDto.Subtotal,
                    Impuesto = detalleDto.Impuesto,
                    Total = detalleDto.Total,
                    Notas = detalleDto.Notas,
                    CreadoEn = DateTime.UtcNow,
                    CreadoPor = userId,
                    Version = 1
                };
                _db.DetallePedidos.Add(detalle);
            }
        }

        return (pedido, wasConflict);
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
