using HandySuites.Application.MovimientosInventario.DTOs;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Pedidos.Services;

public class PedidoService
{
    private readonly IPedidoRepository _repository;
    private readonly ICurrentTenant _tenant;
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly MovimientoInventarioService _movimientoService;

    public PedidoService(
        IPedidoRepository repository,
        ICurrentTenant tenant,
        IUsuarioRepository usuarioRepository,
        MovimientoInventarioService movimientoService)
    {
        _repository = repository;
        _tenant = tenant;
        _usuarioRepository = usuarioRepository;
        _movimientoService = movimientoService;
    }

    public async Task<int> CrearAsync(PedidoCreateDto dto)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        var pedidoId = await _repository.CrearAsync(dto, usuarioId, _tenant.TenantId);

        // Venta Directa: validar stock y crear movimientos de inventario SALIDA
        if (dto.TipoVenta == TipoVenta.VentaDirecta)
        {
            // Validate stock availability before creating inventory movements
            var stockErrors = new List<string>();
            foreach (var detalle in dto.Detalles)
            {
                var stock = await _repository.ObtenerStockDisponibleAsync(detalle.ProductoId, _tenant.TenantId);
                if (stock < detalle.Cantidad)
                {
                    var producto = await _repository.ObtenerNombreProductoAsync(detalle.ProductoId, _tenant.TenantId);
                    stockErrors.Add($"{producto}: solo {stock} disponibles, solicitado {detalle.Cantidad}");
                }
            }
            if (stockErrors.Count > 0)
            {
                throw new InvalidOperationException($"Stock insuficiente: {string.Join("; ", stockErrors)}");
            }

            foreach (var detalle in dto.Detalles)
            {
                await _movimientoService.CrearMovimientoAsync(new MovimientoInventarioCreateDto
                {
                    ProductoId = detalle.ProductoId,
                    TipoMovimiento = "SALIDA",
                    Cantidad = detalle.Cantidad,
                    Motivo = "VENTA",
                    Comentario = $"Venta directa - Pedido #{pedidoId}"
                });
            }
        }

        return pedidoId;
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
        // RBAC: Supervisor ve su equipo, Vendedor solo sus pedidos
        List<int>? filterByUsuarioIds = null;
        if (_tenant.IsSupervisor)
        {
            var supervisorId = int.Parse(_tenant.UserId);
            var subordinadoIds = await _usuarioRepository.ObtenerSubordinadoIdsAsync(supervisorId, _tenant.TenantId);
            subordinadoIds.Add(supervisorId);
            filterByUsuarioIds = subordinadoIds;
        }
        else if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin)
        {
            if (int.TryParse(_tenant.UserId, out var vendedorId))
                filtro.UsuarioId = vendedorId;
        }

        return await _repository.ObtenerPorFiltroAsync(filtro, _tenant.TenantId, filterByUsuarioIds);
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

    [Obsolete("Use ConfirmarAsync instead. Enviar state removed from simplified workflow.")]
    public async Task<bool> EnviarAsync(int id)
    {
        // Legacy redirect: Enviar now maps to Confirmar in the simplified 4-state flow
        return await ConfirmarAsync(id);
    }

    public async Task<bool> ConfirmarAsync(int id)
    {
        return await _repository.CambiarEstadoAsync(id, EstadoPedido.Confirmado, "Pedido confirmado", _tenant.TenantId);
    }

    [Obsolete("Use EnviarARutaAsync instead. EnProceso state removed from simplified workflow.")]
    public async Task<bool> IniciarProcesoAsync(int id)
    {
        // Legacy redirect: IniciarProceso now maps to EnviarARuta in the simplified 4-state flow
        return await EnviarARutaAsync(id);
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
