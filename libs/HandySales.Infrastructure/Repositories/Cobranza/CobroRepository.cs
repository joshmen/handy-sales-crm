using HandySales.Application.Cobranza.DTOs;
using HandySales.Application.Cobranza.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories.Cobranza;

public class CobroRepository : ICobroRepository
{
    private readonly HandySalesDbContext _db;

    private static readonly string[] MetodoPagoNombres = { "Efectivo", "Transferencia", "Cheque", "Tarjeta de Crédito", "Tarjeta de Débito", "Otro" };

    private static string GetMetodoPagoNombre(MetodoPago m) =>
        (int)m >= 0 && (int)m < MetodoPagoNombres.Length ? MetodoPagoNombres[(int)m] : "Desconocido";

    public CobroRepository(HandySalesDbContext db) => _db = db;

    public async Task<List<CobroDto>> ObtenerCobrosAsync(int tenantId, int? clienteId = null, DateTime? desde = null, DateTime? hasta = null, int? usuarioId = null)
    {
        var query = _db.Cobros
            .Include(c => c.Pedido)
            .Include(c => c.Cliente)
            .Include(c => c.Usuario)
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo)
            .AsQueryable();

        if (clienteId.HasValue)
            query = query.Where(c => c.ClienteId == clienteId.Value);
        if (desde.HasValue)
            query = query.Where(c => c.FechaCobro >= desde.Value);
        if (hasta.HasValue)
            query = query.Where(c => c.FechaCobro <= hasta.Value.Date.AddDays(1));
        if (usuarioId.HasValue)
            query = query.Where(c => c.UsuarioId == usuarioId.Value);

        return await query
            .OrderByDescending(c => c.FechaCobro)
            .Select(c => new CobroDto
            {
                Id = c.Id,
                PedidoId = c.PedidoId,
                NumeroPedido = c.Pedido.NumeroPedido,
                ClienteId = c.ClienteId,
                ClienteNombre = c.Cliente.Nombre,
                UsuarioId = c.UsuarioId,
                UsuarioNombre = c.Usuario.Nombre,
                Monto = c.Monto,
                MetodoPago = (int)c.MetodoPago,
                MetodoPagoNombre = c.MetodoPago == MetodoPago.Efectivo ? "Efectivo"
                    : c.MetodoPago == MetodoPago.Transferencia ? "Transferencia"
                    : c.MetodoPago == MetodoPago.Cheque ? "Cheque"
                    : c.MetodoPago == MetodoPago.TarjetaCredito ? "Tarjeta de Crédito"
                    : c.MetodoPago == MetodoPago.TarjetaDebito ? "Tarjeta de Débito"
                    : "Otro",
                FechaCobro = c.FechaCobro,
                Referencia = c.Referencia,
                Notas = c.Notas,
                Activo = c.Activo,
                CreadoEn = c.CreadoEn,
            })
            .ToListAsync();
    }

    public async Task<CobroDto?> ObtenerPorIdAsync(int id, int tenantId)
    {
        return await _db.Cobros
            .Include(c => c.Pedido)
            .Include(c => c.Cliente)
            .Include(c => c.Usuario)
            .AsNoTracking()
            .Where(c => c.Id == id && c.TenantId == tenantId)
            .Select(c => new CobroDto
            {
                Id = c.Id,
                PedidoId = c.PedidoId,
                NumeroPedido = c.Pedido.NumeroPedido,
                ClienteId = c.ClienteId,
                ClienteNombre = c.Cliente.Nombre,
                UsuarioId = c.UsuarioId,
                UsuarioNombre = c.Usuario.Nombre,
                Monto = c.Monto,
                MetodoPago = (int)c.MetodoPago,
                MetodoPagoNombre = c.MetodoPago == MetodoPago.Efectivo ? "Efectivo"
                    : c.MetodoPago == MetodoPago.Transferencia ? "Transferencia"
                    : c.MetodoPago == MetodoPago.Cheque ? "Cheque"
                    : c.MetodoPago == MetodoPago.TarjetaCredito ? "Tarjeta de Crédito"
                    : c.MetodoPago == MetodoPago.TarjetaDebito ? "Tarjeta de Débito"
                    : "Otro",
                FechaCobro = c.FechaCobro,
                Referencia = c.Referencia,
                Notas = c.Notas,
                Activo = c.Activo,
                CreadoEn = c.CreadoEn,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<int> CrearAsync(CobroCreateDto dto, int tenantId, int usuarioId)
    {
        var entity = new Cobro
        {
            TenantId = tenantId,
            PedidoId = dto.PedidoId,
            ClienteId = dto.ClienteId,
            UsuarioId = usuarioId,
            Monto = dto.Monto,
            MetodoPago = (MetodoPago)dto.MetodoPago,
            FechaCobro = dto.FechaCobro ?? DateTime.UtcNow,
            Referencia = dto.Referencia,
            Notas = dto.Notas,
            CreadoEn = DateTime.UtcNow,
            Activo = true,
        };

        _db.Cobros.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> ActualizarAsync(int id, CobroUpdateDto dto, int tenantId)
    {
        var entity = await _db.Cobros.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
        if (entity == null) return false;

        entity.Monto = dto.Monto;
        entity.MetodoPago = (MetodoPago)dto.MetodoPago;
        if (dto.FechaCobro.HasValue) entity.FechaCobro = dto.FechaCobro.Value;
        entity.Referencia = dto.Referencia;
        entity.Notas = dto.Notas;
        entity.ActualizadoEn = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AnularAsync(int id, int tenantId)
    {
        var entity = await _db.Cobros.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
        if (entity == null) return false;

        entity.Activo = false;
        entity.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<SaldoClienteDto>> ObtenerSaldosAsync(int tenantId, int? clienteId = null)
    {
        // Get all delivered/confirmed pedidos with their cobros
        var query = _db.Pedidos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo &&
                        (p.Estado == EstadoPedido.Entregado || p.Estado == EstadoPedido.Confirmado || p.Estado == EstadoPedido.EnRuta || p.Estado == EstadoPedido.EnProceso))
            .AsQueryable();

        if (clienteId.HasValue)
            query = query.Where(p => p.ClienteId == clienteId.Value);

        var pedidosPorCliente = await query
            .GroupBy(p => new { p.ClienteId, Nombre = p.Cliente.Nombre })
            .Select(g => new
            {
                g.Key.ClienteId,
                g.Key.Nombre,
                TotalFacturado = g.Sum(p => p.Total),
                PedidoIds = g.Select(p => p.Id).ToList(),
                CantidadPedidos = g.Count(),
            })
            .ToListAsync();

        if (pedidosPorCliente.Count == 0) return new List<SaldoClienteDto>();

        // Get all active cobros for these clients
        var allPedidoIds = pedidosPorCliente.SelectMany(p => p.PedidoIds).ToList();
        var cobrosPorPedido = await _db.Cobros
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && allPedidoIds.Contains(c.PedidoId))
            .GroupBy(c => c.ClienteId)
            .Select(g => new { ClienteId = g.Key, TotalCobrado = g.Sum(c => c.Monto) })
            .ToListAsync();

        var cobrosDict = cobrosPorPedido.ToDictionary(c => c.ClienteId, c => c.TotalCobrado);

        return pedidosPorCliente.Select(p =>
        {
            var cobrado = cobrosDict.GetValueOrDefault(p.ClienteId, 0m);
            return new SaldoClienteDto
            {
                ClienteId = p.ClienteId,
                ClienteNombre = p.Nombre,
                TotalFacturado = p.TotalFacturado,
                TotalCobrado = cobrado,
                SaldoPendiente = p.TotalFacturado - cobrado,
                PedidosPendientes = p.CantidadPedidos,
            };
        })
        .Where(s => s.SaldoPendiente > 0)
        .OrderByDescending(s => s.SaldoPendiente)
        .ToList();
    }

    public async Task<ResumenCarteraDto> ObtenerResumenCarteraAsync(int tenantId)
    {
        var saldos = await ObtenerSaldosAsync(tenantId);

        return new ResumenCarteraDto
        {
            TotalFacturado = saldos.Sum(s => s.TotalFacturado),
            TotalCobrado = saldos.Sum(s => s.TotalCobrado),
            TotalPendiente = saldos.Sum(s => s.SaldoPendiente),
            ClientesConSaldo = saldos.Count,
        };
    }

    public async Task<EstadoCuentaDto?> ObtenerEstadoCuentaAsync(int clienteId, int tenantId)
    {
        var cliente = await _db.Clientes.AsNoTracking().FirstOrDefaultAsync(c => c.Id == clienteId && c.TenantId == tenantId);
        if (cliente == null) return null;

        var pedidos = await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.ClienteId == clienteId && p.TenantId == tenantId && p.Activo &&
                        (p.Estado == EstadoPedido.Entregado || p.Estado == EstadoPedido.Confirmado || p.Estado == EstadoPedido.EnRuta || p.Estado == EstadoPedido.EnProceso))
            .OrderByDescending(p => p.FechaPedido)
            .Select(p => new { p.Id, p.NumeroPedido, p.FechaPedido, p.Total })
            .ToListAsync();

        var pedidoIds = pedidos.Select(p => p.Id).ToList();
        var cobros = await _db.Cobros
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && pedidoIds.Contains(c.PedidoId))
            .Select(c => new { c.Id, c.PedidoId, c.Monto, c.MetodoPago, c.FechaCobro, c.Referencia })
            .ToListAsync();

        var totalFacturado = pedidos.Sum(p => p.Total);
        var totalCobrado = cobros.Sum(c => c.Monto);

        return new EstadoCuentaDto
        {
            ClienteId = clienteId,
            ClienteNombre = cliente.Nombre,
            TotalFacturado = totalFacturado,
            TotalCobrado = totalCobrado,
            SaldoPendiente = totalFacturado - totalCobrado,
            Pedidos = pedidos.Select(p =>
            {
                var pedidoCobros = cobros.Where(c => c.PedidoId == p.Id).ToList();
                var cobrado = pedidoCobros.Sum(c => c.Monto);
                return new EstadoCuentaPedidoDto
                {
                    PedidoId = p.Id,
                    NumeroPedido = p.NumeroPedido,
                    FechaPedido = p.FechaPedido,
                    Total = p.Total,
                    Cobrado = cobrado,
                    Saldo = p.Total - cobrado,
                    Cobros = pedidoCobros.Select(c => new CobroResumenDto
                    {
                        Id = c.Id,
                        Monto = c.Monto,
                        MetodoPago = (int)c.MetodoPago,
                        MetodoPagoNombre = c.MetodoPago == MetodoPago.Efectivo ? "Efectivo"
                            : c.MetodoPago == MetodoPago.Transferencia ? "Transferencia"
                            : c.MetodoPago == MetodoPago.Cheque ? "Cheque"
                            : c.MetodoPago == MetodoPago.TarjetaCredito ? "Tarjeta de Crédito"
                            : c.MetodoPago == MetodoPago.TarjetaDebito ? "Tarjeta de Débito"
                            : "Otro",
                        FechaCobro = c.FechaCobro,
                        Referencia = c.Referencia,
                    }).ToList(),
                };
            }).ToList(),
        };
    }
}
