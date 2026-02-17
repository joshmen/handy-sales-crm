using HandySales.Application.Pedidos.DTOs;
using HandySales.Domain.Entities;

namespace HandySales.Application.Pedidos.Interfaces;

public interface IPedidoRepository
{
    Task<int> CrearAsync(PedidoCreateDto dto, int usuarioId, int tenantId);
    Task<PedidoDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<PedidoDto?> ObtenerPorNumeroAsync(string numeroPedido, int tenantId);
    Task<PaginatedResult<PedidoListaDto>> ObtenerPorFiltroAsync(PedidoFiltroDto filtro, int tenantId);
    Task<List<PedidoListaDto>> ObtenerPorClienteAsync(int clienteId, int tenantId);
    Task<List<PedidoListaDto>> ObtenerPorUsuarioAsync(int usuarioId, int tenantId);
    Task<bool> ActualizarAsync(int id, PedidoUpdateDto dto, int tenantId);
    Task<bool> CambiarEstadoAsync(int id, EstadoPedido nuevoEstado, string? notas, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<bool> AgregarDetalleAsync(int pedidoId, DetallePedidoCreateDto dto, int tenantId);
    Task<bool> ActualizarDetalleAsync(int pedidoId, int detalleId, DetallePedidoCreateDto dto, int tenantId);
    Task<bool> EliminarDetalleAsync(int pedidoId, int detalleId, int tenantId);
    Task<string> GenerarNumeroPedidoAsync(int tenantId);
    Task<decimal> CalcularTotalAsync(int pedidoId, int tenantId);
}
