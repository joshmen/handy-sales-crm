using HandySuites.Application.Cobranza.DTOs;
using HandySuites.Application.Cobranza.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Repositories.Cobranza;

public class CobroRepository : ICobroRepository
{
    private readonly HandySuitesDbContext _db;

    private static readonly string[] MetodoPagoNombres = { "Efectivo", "Transferencia", "Cheque", "Tarjeta de Crédito", "Tarjeta de Débito", "Otro" };

    private static string GetMetodoPagoNombre(MetodoPago m) =>
        (int)m >= 0 && (int)m < MetodoPagoNombres.Length ? MetodoPagoNombres[(int)m] : "Desconocido";

    public CobroRepository(HandySuitesDbContext db) => _db = db;

    public async Task<List<CobroDto>> ObtenerCobrosAsync(int tenantId, int? clienteId = null, DateTime? desde = null, DateTime? hasta = null, int? usuarioId = null)
    {
        var query = _db.Cobros
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
                NumeroPedido = c.Pedido != null ? c.Pedido.NumeroPedido : null,
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
            .AsNoTracking()
            .Where(c => c.Id == id && c.TenantId == tenantId)
            .Select(c => new CobroDto
            {
                Id = c.Id,
                PedidoId = c.PedidoId,
                NumeroPedido = c.Pedido != null ? c.Pedido.NumeroPedido : null,
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
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
        // Use a transaction to prevent over-payment race conditions
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            // Over-payment guard: if linked to a pedido, lock the row and verify balance
            if (dto.PedidoId.HasValue)
            {
                // Row-level lock prevents concurrent over-payments.
                // Use FOR UPDATE on PostgreSQL; fall back to plain SELECT on SQLite (tests).
                var isPostgres = _db.Database.ProviderName?.Contains("Npgsql") == true;
                var pedido = isPostgres
                    ? await _db.Pedidos
                        .FromSqlInterpolated($"SELECT * FROM \"Pedidos\" WHERE id = {dto.PedidoId.Value} AND tenant_id = {tenantId} AND eliminado_en IS NULL FOR UPDATE")
                        .Select(p => new { p.Total })
                        .FirstOrDefaultAsync()
                    : await _db.Pedidos
                        .AsNoTracking()
                        .Where(p => p.Id == dto.PedidoId.Value && p.TenantId == tenantId)
                        .Select(p => new { p.Total })
                        .FirstOrDefaultAsync();

                if (pedido != null)
                {
                    var cobradoPrevio = (await _db.Cobros
                        .AsNoTracking()
                        .Where(c => c.PedidoId == dto.PedidoId.Value && c.TenantId == tenantId && c.Activo)
                        .Select(c => c.Monto)
                        .ToListAsync())
                        .Sum();

                    var saldoPendiente = pedido.Total - cobradoPrevio;
                    if (dto.Monto > saldoPendiente)
                        throw new InvalidOperationException(
                            $"El monto ({dto.Monto:C}) excede el saldo pendiente del pedido ({saldoPendiente:C})");
                }
            }

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
            await transaction.CommitAsync();
            return entity.Id;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
        }); // end strategy.ExecuteAsync
    }

    public async Task<bool> ActualizarAsync(int id, CobroUpdateDto dto, int tenantId)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var entity = await _db.Cobros.FirstOrDefaultAsync(c => c.Id == id && c.TenantId == tenantId);
            if (entity == null) return false;

            // Over-payment guard: if linked to a pedido, verify the new amount doesn't exceed balance
            if (entity.PedidoId.HasValue)
            {
                var isPostgres = _db.Database.ProviderName?.Contains("Npgsql") == true;
                var pedido = isPostgres
                    ? await _db.Pedidos
                        .FromSqlInterpolated($"SELECT * FROM \"Pedidos\" WHERE id = {entity.PedidoId.Value} AND tenant_id = {tenantId} AND eliminado_en IS NULL FOR UPDATE")
                        .Select(p => new { p.Total })
                        .FirstOrDefaultAsync()
                    : await _db.Pedidos
                        .AsNoTracking()
                        .Where(p => p.Id == entity.PedidoId.Value && p.TenantId == tenantId)
                        .Select(p => new { p.Total })
                        .FirstOrDefaultAsync();

                if (pedido != null)
                {
                    // Sum all OTHER active cobros for this pedido (exclude the one being updated)
                    var cobradoOtros = (await _db.Cobros
                        .AsNoTracking()
                        .Where(c => c.PedidoId == entity.PedidoId.Value && c.TenantId == tenantId && c.Activo && c.Id != id)
                        .Select(c => c.Monto)
                        .ToListAsync())
                        .Sum();

                    var saldoPendiente = pedido.Total - cobradoOtros;
                    if (dto.Monto > saldoPendiente)
                        throw new InvalidOperationException(
                            $"El monto ({dto.Monto:C}) excede el saldo pendiente del pedido ({saldoPendiente:C})");
                }
            }

            entity.Monto = dto.Monto;
            entity.MetodoPago = (MetodoPago)dto.MetodoPago;
            if (dto.FechaCobro.HasValue) entity.FechaCobro = dto.FechaCobro.Value;
            entity.Referencia = dto.Referencia;
            entity.Notas = dto.Notas;
            entity.ActualizadoEn = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
        }); // end strategy.ExecuteAsync
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
        // Get delivered/confirmed pedidos from the last 12 months
        var unAnoAtras = DateTime.UtcNow.AddYears(-1);
#pragma warning disable CS0618 // Legacy enum values still needed for querying existing DB data
        var query = _db.Pedidos
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && p.Activo &&
                        p.FechaPedido >= unAnoAtras &&
                        (p.Estado == EstadoPedido.Entregado || p.Estado == EstadoPedido.Confirmado || p.Estado == EstadoPedido.EnRuta || p.Estado == EstadoPedido.EnProceso))
            .AsQueryable();
#pragma warning restore CS0618

        if (clienteId.HasValue)
            query = query.Where(p => p.ClienteId == clienteId.Value);

        var pedidosRaw = await query
            .Select(p => new { p.ClienteId, p.Cliente.Nombre, p.Total, p.Id })
            .ToListAsync();

        var pedidosPorCliente = pedidosRaw
            .GroupBy(p => new { p.ClienteId, p.Nombre })
            .Select(g => new
            {
                g.Key.ClienteId,
                g.Key.Nombre,
                TotalFacturado = g.Sum(p => p.Total),
                PedidoIds = g.Select(p => p.Id).ToList(),
                CantidadPedidos = g.Count(),
            })
            .ToList();

        if (pedidosPorCliente.Count == 0) return new List<SaldoClienteDto>();

        // Get all active cobros for these clients
        var allPedidoIds = pedidosPorCliente.SelectMany(p => p.PedidoIds).ToList();
        var cobrosRaw = await _db.Cobros
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && c.PedidoId.HasValue && allPedidoIds.Contains(c.PedidoId.Value))
            .Select(c => new { c.ClienteId, c.Monto })
            .ToListAsync();

        var cobrosPorPedido = cobrosRaw
            .GroupBy(c => c.ClienteId)
            .Select(g => new { ClienteId = g.Key, TotalCobrado = g.Sum(c => c.Monto) })
            .ToList();

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

    public async Task<EstadoCuentaDto?> ObtenerEstadoCuentaAsync(int clienteId, int tenantId, bool historico = false)
    {
        var cliente = await _db.Clientes.AsNoTracking().FirstOrDefaultAsync(c => c.Id == clienteId && c.TenantId == tenantId);
        if (cliente == null) return null;

        // Default: last 12 months. historico=true: all-time
#pragma warning disable CS0618 // Legacy enum values still needed for querying existing DB data
        var pedidosQuery = _db.Pedidos
            .AsNoTracking()
            .Where(p => p.ClienteId == clienteId && p.TenantId == tenantId && p.Activo &&
                        (p.Estado == EstadoPedido.Entregado || p.Estado == EstadoPedido.Confirmado || p.Estado == EstadoPedido.EnRuta || p.Estado == EstadoPedido.EnProceso));
#pragma warning restore CS0618

        if (!historico)
        {
            var unAnoAtras = DateTime.UtcNow.AddYears(-1);
            pedidosQuery = pedidosQuery.Where(p => p.FechaPedido >= unAnoAtras);
        }

        var pedidos = await pedidosQuery
            .OrderByDescending(p => p.FechaPedido)
            .Select(p => new { p.Id, p.NumeroPedido, p.FechaPedido, p.Total })
            .ToListAsync();

        var pedidoIds = pedidos.Select(p => p.Id).ToList();
        var cobros = await _db.Cobros
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Activo && c.PedidoId.HasValue && pedidoIds.Contains(c.PedidoId.Value))
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
                        MetodoPagoNombre = GetMetodoPagoNombre(c.MetodoPago),
                        FechaCobro = c.FechaCobro,
                        Referencia = c.Referencia,
                    }).ToList(),
                };
            }).ToList(),
        };
    }
}
