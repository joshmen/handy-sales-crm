using HandySales.Application.Inventario.Interfaces;
using HandySales.Application.MovimientosInventario.DTOs;
using HandySales.Application.MovimientosInventario.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.MovimientosInventario.Services;

public class MovimientoInventarioService
{
    private readonly IMovimientoInventarioRepository _movimientoRepo;
    private readonly IInventarioRepository _inventarioRepo;
    private readonly ICurrentTenant _tenant;

    public MovimientoInventarioService(
        IMovimientoInventarioRepository movimientoRepo,
        IInventarioRepository inventarioRepo,
        ICurrentTenant tenant)
    {
        _movimientoRepo = movimientoRepo;
        _inventarioRepo = inventarioRepo;
        _tenant = tenant;
    }

    public Task<MovimientoInventarioPaginadoDto> ObtenerPorFiltroAsync(MovimientoInventarioFiltroDto filtro)
        => _movimientoRepo.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);

    public Task<MovimientoInventarioDto?> ObtenerPorIdAsync(int id)
        => _movimientoRepo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<List<MovimientoInventarioListaDto>> ObtenerPorProductoAsync(int productoId, int limite = 10)
        => _movimientoRepo.ObtenerPorProductoAsync(productoId, _tenant.TenantId, limite);

    public async Task<(int MovimientoId, bool Success, string? Error)> CrearMovimientoAsync(MovimientoInventarioCreateDto dto)
    {
        // Obtener inventario actual del producto
        var inventario = await _inventarioRepo.ObtenerPorProductoIdAsync(dto.ProductoId, _tenant.TenantId);

        if (inventario == null)
        {
            return (0, false, $"No existe inventario para el producto con ID {dto.ProductoId}");
        }

        var cantidadAnterior = inventario.CantidadActual;
        decimal cantidadNueva;

        // Calcular nueva cantidad según el tipo de movimiento
        switch (dto.TipoMovimiento.ToUpperInvariant())
        {
            case "ENTRADA":
                cantidadNueva = cantidadAnterior + dto.Cantidad;
                break;
            case "SALIDA":
                if (cantidadAnterior < dto.Cantidad)
                {
                    return (0, false, $"Stock insuficiente. Stock actual: {cantidadAnterior}, solicitado: {dto.Cantidad}");
                }
                cantidadNueva = cantidadAnterior - dto.Cantidad;
                break;
            case "AJUSTE":
                // En ajuste, la cantidad es el valor absoluto final
                cantidadNueva = dto.Cantidad;
                break;
            default:
                return (0, false, $"Tipo de movimiento inválido: {dto.TipoMovimiento}. Use ENTRADA, SALIDA o AJUSTE");
        }

        // Actualizar el inventario
        var updateDto = new Inventario.DTOs.InventarioUpdateDto
        {
            CantidadActual = cantidadNueva,
            StockMinimo = inventario.StockMinimo,
            StockMaximo = inventario.StockMaximo
        };

        var inventarioActualizado = await _inventarioRepo.ActualizarAsync(dto.ProductoId, updateDto, _tenant.TenantId);
        if (!inventarioActualizado)
        {
            return (0, false, "Error al actualizar el inventario");
        }

        // Obtener el usuario ID del claim
        int usuarioId = 0;
        if (int.TryParse(_tenant.UserId, out var uid))
        {
            usuarioId = uid;
        }

        // Crear el movimiento
        var movimientoId = await _movimientoRepo.CrearAsync(dto, _tenant.TenantId, usuarioId, cantidadAnterior, cantidadNueva);

        return (movimientoId, true, null);
    }
}
