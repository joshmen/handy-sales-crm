using HandySales.Application.Pedidos.DTOs;
using HandySales.Application.Pedidos.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Pedidos.Services;

public class PedidoService
{
    private readonly IPedidoRepository _repository;
    private readonly ICurrentTenant _tenant;

    public PedidoService(IPedidoRepository repository, ICurrentTenant tenant)
    {
        _repository = repository;
        _tenant = tenant;
    }

    public async Task<int> CrearAsync(PedidoCreateDto dto)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.CrearAsync(dto, usuarioId, _tenant.TenantId);
    }

    public async Task<PedidoDto?> ObtenerPorIdAsync(int id)
    {
        return await _repository.ObtenerPorIdAsync(id, _tenant.TenantId);
    }

    public async Task<PedidoDto?> ObtenerPorNumeroAsync(string numeroPedido)
    {
        return await _repository.ObtenerPorNumeroAsync(numeroPedido, _tenant.TenantId);
    }

    public async Task<PaginatedResult<PedidoListaDto>> ObtenerPorFiltroAsync(PedidoFiltroDto filtro)
    {
        // RBAC: Vendedor solo ve sus pedidos
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin)
        {
            if (int.TryParse(_tenant.UserId, out var vendedorId))
                filtro.UsuarioId = vendedorId;
        }

        return await _repository.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);
    }

    public async Task<List<PedidoListaDto>> ObtenerPorClienteAsync(int clienteId)
    {
        return await _repository.ObtenerPorClienteAsync(clienteId, _tenant.TenantId);
    }

    public async Task<List<PedidoListaDto>> ObtenerMisPedidosAsync()
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.ObtenerPorUsuarioAsync(usuarioId, _tenant.TenantId);
    }

    public async Task<List<PedidoListaDto>> ObtenerPorUsuarioAsync(int usuarioId)
    {
        return await _repository.ObtenerPorUsuarioAsync(usuarioId, _tenant.TenantId);
    }

    public async Task<bool> ActualizarAsync(int id, PedidoUpdateDto dto)
    {
        return await _repository.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    public async Task<bool> EnviarAsync(int id)
    {
        return await _repository.CambiarEstadoAsync(id, EstadoPedido.Enviado, "Pedido enviado", _tenant.TenantId);
    }

    public async Task<bool> ConfirmarAsync(int id)
    {
        return await _repository.CambiarEstadoAsync(id, EstadoPedido.Confirmado, "Pedido confirmado", _tenant.TenantId);
    }

    public async Task<bool> IniciarProcesoAsync(int id)
    {
        return await _repository.CambiarEstadoAsync(id, EstadoPedido.EnProceso, "Pedido en proceso", _tenant.TenantId);
    }

    public async Task<bool> EnviarARutaAsync(int id)
    {
        return await _repository.CambiarEstadoAsync(id, EstadoPedido.EnRuta, "Pedido en ruta de entrega", _tenant.TenantId);
    }

    public async Task<bool> EntregarAsync(int id, string? notas)
    {
        return await _repository.CambiarEstadoAsync(id, EstadoPedido.Entregado, notas ?? "Pedido entregado", _tenant.TenantId);
    }

    public async Task<bool> CancelarAsync(int id, string? motivo)
    {
        return await _repository.CambiarEstadoAsync(id, EstadoPedido.Cancelado, motivo ?? "Pedido cancelado", _tenant.TenantId);
    }

    public async Task<bool> EliminarAsync(int id)
    {
        return await _repository.EliminarAsync(id, _tenant.TenantId);
    }

    public async Task<bool> AgregarDetalleAsync(int pedidoId, DetallePedidoCreateDto dto)
    {
        return await _repository.AgregarDetalleAsync(pedidoId, dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarDetalleAsync(int pedidoId, int detalleId, DetallePedidoCreateDto dto)
    {
        return await _repository.ActualizarDetalleAsync(pedidoId, detalleId, dto, _tenant.TenantId);
    }

    public async Task<bool> EliminarDetalleAsync(int pedidoId, int detalleId)
    {
        return await _repository.EliminarDetalleAsync(pedidoId, detalleId, _tenant.TenantId);
    }
}
