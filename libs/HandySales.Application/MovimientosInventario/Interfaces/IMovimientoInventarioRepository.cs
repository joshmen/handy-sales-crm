using HandySales.Application.MovimientosInventario.DTOs;

namespace HandySales.Application.MovimientosInventario.Interfaces;

public interface IMovimientoInventarioRepository
{
    Task<MovimientoInventarioPaginadoDto> ObtenerPorFiltroAsync(MovimientoInventarioFiltroDto filtro, int tenantId);
    Task<MovimientoInventarioDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<List<MovimientoInventarioListaDto>> ObtenerPorProductoAsync(int productoId, int tenantId, int limite = 10);
    Task<int> CrearAsync(MovimientoInventarioCreateDto dto, int tenantId, int usuarioId, decimal cantidadAnterior, decimal cantidadNueva);
}
