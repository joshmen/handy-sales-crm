using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Pedidos.Interfaces;

public enum CambiarEstadoStatus { Ok, NotFound, TransicionInvalida }
public record CambiarEstadoOutcome(CambiarEstadoStatus Status, EstadoPedido? EstadoActual);

public interface IPedidoRepository
{
    Task<int> CrearAsync(PedidoCreateDto dto, int usuarioId, int tenantId);
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
