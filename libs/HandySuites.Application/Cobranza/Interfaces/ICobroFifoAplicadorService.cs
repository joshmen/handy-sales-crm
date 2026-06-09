using HandySuites.Application.Cobranza.DTOs;

namespace HandySuites.Application.Cobranza.Interfaces;

/// <summary>
/// 2026-06-08: distribuidor FIFO de cobros — modo AbonoFifo del plan
/// eager-drifting. Toma (clienteId, monto) y aplica el monto contra los
/// pedidos abiertos del cliente en orden cronológico ascendente (FIFO).
/// Por cada pedido tocado, crea un Cobro hijo via el repository regular
/// (que aplica advisory lock anti-overpayment per-pedido).
///
/// Es semánticamente distinto de Anticipo: aquí el dinero SÍ tiene
/// pedidos a los cuales aplicar — solo automatizamos la distribución.
/// Si el monto excede el saldo total pendiente, throw (no degrada a
/// Anticipo automáticamente — el vendedor debe elegir explícitamente).
/// </summary>
public interface ICobroFifoAplicadorService
{
    /// <summary>
    /// Distribuye `monto` FIFO contra pedidos abiertos del cliente.
    /// Retorna lista de cobros creados (uno per-pedido tocado, en orden FIFO).
    /// Throws si:
    /// - Cliente sin pedidos abiertos (saldo > 0).
    /// - Monto > suma de saldos pendientes (overflow no permitido en FIFO puro;
    ///   el caller debe usar modo Anticipo si quiere generar saldo a favor).
    /// </summary>
    Task<List<FifoAplicacionDto>> DistribuirAsync(
        int clienteId,
        decimal monto,
        int metodoPago,
        DateTime? fechaCobro,
        string? referencia,
        string? notas);

    /// <summary>
    /// 2026-06-09 PR 6 plan eager-drifting cobros (FIFO preview).
    /// Calcula la distribución FIFO SIN persistir en DB. Solo aplica la
    /// lógica de cálculo + validación para que la UI pueda mostrar un
    /// preview ("Aplicará $X a PED-001, $Y a PED-002 …") antes del submit.
    ///
    /// Throws si:
    /// - Cliente no existe en el tenant actual.
    /// - Cliente sin pedidos abiertos.
    /// - Monto &gt; suma de saldos pendientes.
    ///
    /// Retorna lista con CobroId=0 (el preview no genera cobros).
    /// </summary>
    Task<List<FifoAplicacionDto>> CalcularSinPersistirAsync(int clienteId, decimal monto);
}

/// <summary>
/// Resultado per-pedido de una aplicación FIFO. UI puede preview esto
/// antes de submit ("Aplicará $X a PED-001, $Y a PED-002 …").
/// </summary>
public record FifoAplicacionDto(int CobroId, int PedidoId, string NumeroPedido, decimal MontoAplicado);
