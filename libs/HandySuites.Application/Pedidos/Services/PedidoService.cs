using HandySuites.Application.Common.Interfaces;
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
    private readonly ITransactionManager _transactions;

    public PedidoService(
        IPedidoRepository repository,
        ICurrentTenant tenant,
        IUsuarioRepository usuarioRepository,
        MovimientoInventarioService movimientoService,
        ITransactionManager transactions)
    {
        _repository = repository;
        _tenant = tenant;
        _usuarioRepository = usuarioRepository;
        _movimientoService = movimientoService;
        _transactions = transactions;
    }

    public async Task<int> CrearAsync(PedidoCreateDto dto)
    {
        var usuarioId = int.Parse(_tenant.UserId);

        // Cliente debe estar activo: uno desactivado no debe generar pedidos nuevos.
        if (!await _repository.ClienteActivoAsync(dto.ClienteId, _tenant.TenantId))
        {
            throw new InvalidOperationException("El cliente seleccionado está desactivado. Reactívalo antes de crear pedidos.");
        }

        // Existence check: lista de precios (opcional) debe pertenecer al tenant.
        if (dto.ListaPrecioId is int listaId && listaId > 0
            && !await _repository.ExisteListaPrecioAsync(listaId, _tenant.TenantId))
        {
            throw new InvalidOperationException("La lista de precios especificada no existe o no pertenece a tu empresa.");
        }

        // Detalles duplicados (mismo productoId > 1 vez): rechazar para evitar que
        // venta directa haga múltiples SALIDAs y que la UI muestre el mismo item 2×.
        var duplicados = dto.Detalles.GroupBy(d => d.ProductoId)
            .Where(g => g.Count() > 1).Select(g => g.Key).ToList();
        if (duplicados.Count > 0)
        {
            throw new InvalidOperationException(
                $"El pedido contiene productos duplicados (IDs: {string.Join(", ", duplicados)}). Consolida la cantidad en una sola línea.");
        }

        // Validaciones por producto: activo + descuento <= subtotal.
        foreach (var detalle in dto.Detalles)
        {
            // Producto debe estar activo: uno desactivado (descontinuado) no debe venderse.
            if (!await _repository.ProductoActivoAsync(detalle.ProductoId, _tenant.TenantId))
            {
                throw new InvalidOperationException($"El producto con ID {detalle.ProductoId} está desactivado y no puede venderse.");
            }
            // Validar que descuento no cree total negativo.
            if (detalle.PrecioUnitario.HasValue && detalle.Descuento.HasValue)
            {
                var subtotal = detalle.Cantidad * detalle.PrecioUnitario.Value;
                if (detalle.Descuento.Value > subtotal)
                {
                    throw new InvalidOperationException(
                        $"El descuento ({detalle.Descuento.Value:N2}) del producto {detalle.ProductoId} excede el subtotal ({subtotal:N2}).");
                }
            }
        }

        // BR-001: Para Venta Directa, validar stock ANTES de crear el pedido.
        // Antes se creaba el pedido primero y la validación fallaba después, dejando
        // pedidos huérfanos en la DB (Audit CRITICAL-1, Abril 2026).
        if (dto.TipoVenta == TipoVenta.VentaDirecta)
        {
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
        }

        // BR-002: Pedido + movimientos de inventario en la misma transacción —
        // si el movimiento falla, el pedido debe rollback. ExecutionStrategy
        // wrapping required because DbContext has EnableRetryOnFailure.
        return await _transactions.ExecuteInTransactionAsync(async () =>
        {
            var pedidoId = await _repository.CrearAsync(dto, usuarioId, _tenant.TenantId);

            if (dto.TipoVenta == TipoVenta.VentaDirecta)
            {
                foreach (var detalle in dto.Detalles)
                {
                    var (_, success, error) = await _movimientoService.CrearMovimientoAsync(new MovimientoInventarioCreateDto
                    {
                        ProductoId = detalle.ProductoId,
                        TipoMovimiento = "SALIDA",
                        Cantidad = detalle.Cantidad,
                        Motivo = "VENTA",
                        Comentario = $"Venta directa - Pedido #{pedidoId}"
                    });

                    if (!success)
                    {
                        throw new InvalidOperationException($"No se pudo registrar el movimiento de inventario: {error ?? "error desconocido"}");
                    }
                }
            }

            return pedidoId;
        });
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
        // Sanitizar paginación (evita 500 por offset negativo y overflow en totalPaginas).
        if ((filtro.Pagina ?? 1) < 1) filtro.Pagina = 1;
        if ((filtro.TamanoPagina ?? 20) < 1) filtro.TamanoPagina = 20;
        if ((filtro.TamanoPagina ?? 20) > 200) filtro.TamanoPagina = 200;
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
        if (dto.ListaPrecioId is int listaId && listaId > 0
            && !await _repository.ExisteListaPrecioAsync(listaId, _tenant.TenantId))
        {
            throw new InvalidOperationException("La lista de precios especificada no existe o no pertenece a tu empresa.");
        }
        if (dto.Detalles is not null && dto.Detalles.Count > 0)
        {
            var dups = dto.Detalles.GroupBy(d => d.ProductoId).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
            if (dups.Count > 0)
                throw new InvalidOperationException(
                    $"El pedido contiene productos duplicados (IDs: {string.Join(", ", dups)}). Consolida la cantidad en una sola línea.");
            foreach (var det in dto.Detalles)
            {
                if (!await _repository.ExisteProductoAsync(det.ProductoId, _tenant.TenantId))
                    throw new InvalidOperationException($"El producto con ID {det.ProductoId} no existe o no pertenece a tu empresa.");
            }
        }
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

    public Task<CambiarEstadoOutcome> ConfirmarDetalladoAsync(int id)
        => _repository.CambiarEstadoDetalladoAsync(id, EstadoPedido.Confirmado, "Pedido confirmado", _tenant.TenantId);

    public Task<CambiarEstadoOutcome> EnviarARutaDetalladoAsync(int id)
        => _repository.CambiarEstadoDetalladoAsync(id, EstadoPedido.EnRuta, "Pedido en ruta de entrega", _tenant.TenantId);

    public Task<CambiarEstadoOutcome> EntregarDetalladoAsync(int id, string? notas)
        => _repository.CambiarEstadoDetalladoAsync(id, EstadoPedido.Entregado, notas ?? "Pedido entregado", _tenant.TenantId);

    public Task<CambiarEstadoOutcome> CancelarDetalladoAsync(int id, string? motivo)
        => _repository.CambiarEstadoDetalladoAsync(id, EstadoPedido.Cancelado, motivo ?? "Pedido cancelado", _tenant.TenantId);

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
