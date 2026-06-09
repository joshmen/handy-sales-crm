using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Pedidos.Interfaces;

public enum CambiarEstadoStatus { Ok, NotFound, TransicionInvalida, SinRutaActiva }
public record CambiarEstadoOutcome(CambiarEstadoStatus Status, EstadoPedido? EstadoActual);

/// <summary>
/// Outcome del eager-save (B.1). Si Idempotent=true, el ServerId apunta al
/// Pedido pre-existente y NO se modificó nada — el cliente debe usar ese serverId
/// para próximos sync push sin duplicar.
/// </summary>
public record PedidoEagerSaveOutcome(int ServerId, EstadoPedido Estado, DateTime AckedAt, bool Idempotent);

public interface IPedidoRepository
{
    Task<int> CrearAsync(PedidoCreateDto dto, int usuarioId, int tenantId);
    /// <summary>
    /// B.1 eager-save (fix prod 2026-06-04). Crea un Pedido con Estado=Borrador
    /// idempotentemente vía mobile_record_id. NO ejecuta BOGO, NO valida stock,
    /// NO decrementa inventario, NO toca RutasCarga — solo persiste para
    /// durabilidad. Genera NumeroPedido porque la columna es NOT NULL (schema
    /// constraint pre-existente). La promoción Borrador → Confirmado/Entregado
    /// (con sus side effects) pasa por el sync push normal (UpsertPedidoAsync).
    ///
    /// Si ya existe un Pedido con (mobile_record_id, tenant_id), retorna su id
    /// existente con outcome.Idempotent=true SIN tocar nada.
    /// </summary>
    Task<PedidoEagerSaveOutcome> EagerSaveAsync(PedidoEagerSaveDto dto, int usuarioId, int tenantId);

    /// <summary>
    /// C.1 — Drafts huérfanos. Lista Pedidos en Estado=Borrador cuyo CreadoEn
    /// es >= cutoffDate. Soporta filtro opcional por usuarioId (supervisor
    /// inspeccionando un vendedor específico).
    /// </summary>
    Task<List<OrphanDraftDto>> GetOrphanDraftsAsync(DateTime cutoffDate, int tenantId, int? usuarioId = null);

    Task<PedidoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<PedidoDto?> ObtenerPorNumeroAsync(string numeroPedido, int tenantId);
    Task<PaginatedResult<PedidoListaDto>> ObtenerPorFiltroAsync(PedidoFiltroDto filtro, int tenantId, List<int>? filterByUsuarioIds = null);
    Task<List<PedidoListaDto>> ObtenerPorClienteAsync(int clienteId, int tenantId);
    Task<List<PedidoListaDto>> ObtenerPorUsuarioAsync(int usuarioId, int tenantId);
    Task<bool> ActualizarAsync(int id, PedidoUpdateDto dto, int tenantId);
    Task<bool> CambiarEstadoAsync(int id, EstadoPedido nuevoEstado, string? notas, int tenantId);
    Task<CambiarEstadoOutcome> CambiarEstadoDetalladoAsync(int id, EstadoPedido nuevoEstado, string? notas, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<bool> AgregarDetalleAsync(int pedidoId, DetallePedidoCreateDto dto, int tenantId);
    Task<bool> ActualizarDetalleAsync(int pedidoId, int detalleId, DetallePedidoCreateDto dto, int tenantId);
    Task<bool> EliminarDetalleAsync(int pedidoId, int detalleId, int tenantId);
    Task<string> GenerarNumeroPedidoAsync(int tenantId, string tipo = "PED");
    Task<decimal> CalcularTotalAsync(int pedidoId, int tenantId);
    Task<decimal> ObtenerStockDisponibleAsync(int productoId, int tenantId);
    Task<string> ObtenerNombreProductoAsync(int productoId, int tenantId);
    Task<bool> ExisteClienteAsync(int clienteId, int tenantId);
    Task<bool> ExisteProductoAsync(int productoId, int tenantId);
    Task<bool> ExisteListaPrecioAsync(int listaPrecioId, int tenantId);
    Task<bool> ClienteActivoAsync(int clienteId, int tenantId);
    Task<bool> ProductoActivoAsync(int productoId, int tenantId);
}
