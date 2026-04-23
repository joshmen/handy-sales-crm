using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Inventario.Interfaces;
using HandySuites.Application.MovimientosInventario.DTOs;
using HandySuites.Application.MovimientosInventario.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.MovimientosInventario.Services;

public class MovimientoInventarioService
{
    private readonly IMovimientoInventarioRepository _movimientoRepo;
    private readonly IInventarioRepository _inventarioRepo;
    private readonly ICurrentTenant _tenant;
    private readonly ITransactionManager _transactionManager;

    public MovimientoInventarioService(
        IMovimientoInventarioRepository movimientoRepo,
        IInventarioRepository inventarioRepo,
        ICurrentTenant tenant,
        ITransactionManager transactionManager)
    {
        _movimientoRepo = movimientoRepo;
        _inventarioRepo = inventarioRepo;
        _tenant = tenant;
        _transactionManager = transactionManager;
    }

    public Task<MovimientoInventarioPaginadoDto> ObtenerPorFiltroAsync(MovimientoInventarioFiltroDto filtro)
        => _movimientoRepo.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);

    public Task<MovimientoInventarioDto?> ObtenerPorIdAsync(int id)
        => _movimientoRepo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<List<MovimientoInventarioListaDto>> ObtenerPorProductoAsync(int productoId, int limite = 10)
        => _movimientoRepo.ObtenerPorProductoAsync(productoId, _tenant.TenantId, limite);

    public async Task<(int MovimientoId, bool Success, string? Error)> CrearMovimientoAsync(MovimientoInventarioCreateDto dto)
    {
        var tipoUpper = dto.TipoMovimiento.ToUpperInvariant();
        if (tipoUpper != "ENTRADA" && tipoUpper != "SALIDA" && tipoUpper != "AJUSTE")
            return (0, false, $"Tipo de movimiento inválido: {dto.TipoMovimiento}. Use ENTRADA, SALIDA o AJUSTE");

        return await _transactionManager.ExecuteInTransactionAsync<(int, bool, string?)>(async () =>
        {
            await _inventarioRepo.AcquireProductoLockAsync(_tenant.TenantId, dto.ProductoId);

            var inventario = await _inventarioRepo.ObtenerPorProductoIdAsync(dto.ProductoId, _tenant.TenantId);
            if (inventario == null)
                return (0, false, $"No existe inventario para el producto con ID {dto.ProductoId}");

            var cantidadAnterior = inventario.CantidadActual;
            decimal cantidadNueva;

            switch (tipoUpper)
            {
                case "ENTRADA":
                    cantidadNueva = cantidadAnterior + dto.Cantidad;
                    break;
                case "SALIDA":
                    if (cantidadAnterior < dto.Cantidad)
                        return (0, false, $"Stock insuficiente. Stock actual: {cantidadAnterior}, solicitado: {dto.Cantidad}");
                    cantidadNueva = cantidadAnterior - dto.Cantidad;
                    break;
                default:
                    cantidadNueva = dto.Cantidad;
                    break;
            }

            var updateDto = new Inventario.DTOs.InventarioUpdateDto
            {
                CantidadActual = cantidadNueva,
                StockMinimo = inventario.StockMinimo,
                StockMaximo = inventario.StockMaximo
            };

            var inventarioActualizado = await _inventarioRepo.ActualizarAsync(inventario.Id, updateDto, _tenant.TenantId);
            if (!inventarioActualizado)
            {
                throw new InvalidOperationException("Error al actualizar el inventario");
            }

            int usuarioId = int.TryParse(_tenant.UserId, out var uid) ? uid : 0;
            var movimientoId = await _movimientoRepo.CrearAsync(dto, _tenant.TenantId, usuarioId, cantidadAnterior, cantidadNueva);
            return (movimientoId, true, (string?)null);
        });
    }
}
