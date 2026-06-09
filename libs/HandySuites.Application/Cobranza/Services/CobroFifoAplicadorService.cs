using HandySuites.Application.Cobranza.DTOs;
using HandySuites.Application.Cobranza.Interfaces;
using HandySuites.Shared.Multitenancy;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace HandySuites.Application.Cobranza.Services;

/// <summary>
/// 2026-06-08 PR 2 plan eager-drifting cobros.
///
/// Algoritmo:
///   1. Obtiene estado de cuenta del cliente (pedidos abiertos con saldo &gt; 0).
///   2. Ordena FIFO (FechaPedido ASC). Pedido más viejo primero.
///   3. Itera: aplica min(monto_restante, pedido.Saldo) → crea Cobro
///      via repo con PedidoId del pedido actual. El repo internamente
///      hace advisory lock + overpayment guard per-pedido.
///   4. Si después de iterar todos los pedidos queda monto_restante > 0:
///      throw — el monto excedió la deuda total. El caller debe llamar
///      al modo Anticipo explícitamente para generar saldoFavor.
///   5. Si cliente sin pedidos abiertos: throw — caller debe usar Anticipo.
///
/// Atomicidad: NO envolvemos en transaction global. Cada cobro creado
/// por el repo es atómico per-pedido (advisory lock). Si una iteración
/// falla a mitad, los cobros creados ANTES quedan committed → vendedor
/// retry con monto reducido (los anteriores se ven en estado de cuenta).
/// Esta semántica es preferible vs rollback global porque preserva el
/// progreso parcial sin requerir el dinero entero de nuevo.
/// </summary>
public class CobroFifoAplicadorService : ICobroFifoAplicadorService
{
    private readonly ICobroRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly ILogger<CobroFifoAplicadorService> _logger;

    public CobroFifoAplicadorService(
        ICobroRepository repo,
        ICurrentTenant tenant,
        ILogger<CobroFifoAplicadorService>? logger = null)
    {
        _repo = repo;
        _tenant = tenant;
        _logger = logger ?? NullLogger<CobroFifoAplicadorService>.Instance;
    }

    public async Task<List<FifoAplicacionDto>> DistribuirAsync(
        int clienteId,
        decimal monto,
        int metodoPago,
        DateTime? fechaCobro,
        string? referencia,
        string? notas)
    {
        // 2026-06-09 PR 6: la lógica de cálculo FIFO se extrajo a
        // CalcularSinPersistirAsync para reuso del endpoint /cobros/fifo-preview.
        // Aquí solo persistimos cada aplicación via _repo.CrearAsync.
        var planeadas = await CalcularSinPersistirAsync(clienteId, monto);

        var userId = int.Parse(_tenant.UserId);
        var aplicaciones = new List<FifoAplicacionDto>(planeadas.Count);

        foreach (var planeada in planeadas)
        {
            // Crea un cobro per-pedido con PedidoId asignado. El repo aplica
            // advisory lock + overpayment guard. Modo=PorPedido (default OK).
            var dto = new CobroCreateDto(
                PedidoId: planeada.PedidoId,
                ClienteId: clienteId,
                Monto: planeada.MontoAplicado,
                MetodoPago: metodoPago,
                FechaCobro: fechaCobro,
                Referencia: referencia,
                Notas: notas != null ? $"{notas} (FIFO aplicacion)" : "Aplicacion FIFO");

            var cobroId = await _repo.CrearAsync(dto, _tenant.TenantId, userId);
            aplicaciones.Add(new FifoAplicacionDto(cobroId, planeada.PedidoId, planeada.NumeroPedido, planeada.MontoAplicado));

            _logger.LogInformation(
                "CobroFifoAplicador: aplicado {Aplicar} a pedido {PedidoId} ({Numero}) cliente {ClienteId}. CobroId={CobroId}.",
                planeada.MontoAplicado, planeada.PedidoId, planeada.NumeroPedido, clienteId, cobroId);
        }

        return aplicaciones;
    }

    public async Task<List<FifoAplicacionDto>> CalcularSinPersistirAsync(int clienteId, decimal monto)
    {
        if (monto <= 0)
            throw new InvalidOperationException("El monto debe ser mayor a cero.");

        var estadoCuenta = await _repo.ObtenerEstadoCuentaAsync(clienteId, _tenant.TenantId, historico: false);
        if (estadoCuenta == null)
        {
            _logger.LogWarning("CobroFifoAplicador.CalcularSinPersistirAsync: cliente {ClienteId} no existe en tenant {TenantId}", clienteId, _tenant.TenantId);
            throw new InvalidOperationException("El cliente no existe o no pertenece a tu empresa.");
        }

        // Pedidos abiertos con saldo > 0, ordenados FIFO (más viejo primero).
        var pedidosAbiertos = estadoCuenta.Pedidos
            .Where(p => p.Saldo > 0)
            .OrderBy(p => p.FechaPedido)
            .ToList();

        if (pedidosAbiertos.Count == 0)
        {
            _logger.LogInformation(
                "CobroFifoAplicador.CalcularSinPersistirAsync: cliente {ClienteId} no tiene pedidos abiertos. Sugiere modo Anticipo.",
                clienteId);
            throw new InvalidOperationException(
                "El cliente no tiene pedidos pendientes para aplicar. Usa el modo 'Anticipo' si quieres registrar el cobro como saldo a favor.");
        }

        var saldoTotalCliente = pedidosAbiertos.Sum(p => p.Saldo);
        if (monto > saldoTotalCliente)
        {
            _logger.LogWarning(
                "CobroFifoAplicador.CalcularSinPersistirAsync: monto={Monto} excede saldo total cliente={Saldo} (cliente {ClienteId})",
                monto, saldoTotalCliente, clienteId);
            throw new InvalidOperationException(
                $"El monto ({monto:C}) excede el saldo total pendiente del cliente ({saldoTotalCliente:C}). " +
                $"Reduce el monto o usa el modo 'Anticipo' para la diferencia.");
        }

        // Calcula la distribución FIFO sin tocar DB. CobroId=0 en preview.
        var aplicaciones = new List<FifoAplicacionDto>();
        var restante = monto;

        foreach (var pedido in pedidosAbiertos)
        {
            if (restante <= 0) break;

            var aplicar = Math.Min(restante, pedido.Saldo);
            aplicaciones.Add(new FifoAplicacionDto(0, pedido.PedidoId, pedido.NumeroPedido, aplicar));
            restante -= aplicar;
        }

        return aplicaciones;
    }
}
