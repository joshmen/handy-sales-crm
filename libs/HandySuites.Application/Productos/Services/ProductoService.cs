using HandySuites.Application.Productos.DTOs;
using HandySuites.Application.Productos.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Productos.Services;

public class ProductoService
{
    private readonly IProductoRepository _repo;
    private readonly ICurrentTenant _tenant;

    public ProductoService(IProductoRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<ProductoDto>> ObtenerProductosAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<ProductoDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearProductoAsync(ProductoCreateDto dto)
    {
        await ValidarCatalogosFkAsync(dto);
        // Unicidad de código de barras por tenant — evita escaneos ambiguos.
        if (!string.IsNullOrWhiteSpace(dto.CodigoBarra)
            && await _repo.ExisteCodigoBarraAsync(dto.CodigoBarra, _tenant.TenantId, excludeId: null))
            throw new InvalidOperationException($"Ya existe un producto con el código de barras '{dto.CodigoBarra}'.");
        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarProductoAsync(int id, ProductoCreateDto dto)
    {
        await ValidarCatalogosFkAsync(dto);
        if (!string.IsNullOrWhiteSpace(dto.CodigoBarra)
            && await _repo.ExisteCodigoBarraAsync(dto.CodigoBarra, _tenant.TenantId, excludeId: id))
            throw new InvalidOperationException($"Ya existe otro producto con el código de barras '{dto.CodigoBarra}'.");
        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    private async Task ValidarCatalogosFkAsync(ProductoCreateDto dto)
    {
        if (!await _repo.ExisteFamiliaAsync(dto.FamiliaId, _tenant.TenantId))
            throw new InvalidOperationException("La familia seleccionada no existe o no pertenece a tu empresa.");
        if (!await _repo.ExisteCategoriaAsync(dto.CategoraId, _tenant.TenantId))
            throw new InvalidOperationException("La categoría seleccionada no existe o no pertenece a tu empresa.");
        if (!await _repo.ExisteUnidadMedidaAsync(dto.UnidadMedidaId))
            throw new InvalidOperationException("La unidad de medida seleccionada no existe.");
    }

    public record EliminarProductoResult(bool Success, string? Error = null, int PedidosActivos = 0);

    public async Task<EliminarProductoResult> EliminarProductoAsync(int id, bool forzar = false)
    {
        // Regla: no permitir borrar producto con detalles en pedidos no-terminales
        // (Borrador/Confirmado/EnRuta) salvo forzar. Protege de perder visibilidad
        // del producto en pedidos en curso por el global query filter.
        if (!forzar)
        {
            var pedidosActivos = await _repo.ContarPedidosActivosAsync(id, _tenant.TenantId);
            if (pedidosActivos > 0)
                return new EliminarProductoResult(false,
                    Error: $"El producto aparece en {pedidosActivos} pedido(s) activo(s). Termínalos o cancélalos primero, o pasa `?forzar=true` para borrar de todas formas.",
                    PedidosActivos: pedidosActivos);
        }
        var ok = await _repo.EliminarAsync(id, _tenant.TenantId);
        return new EliminarProductoResult(ok);
    }

    public Task<ProductoPaginatedResult> ObtenerPorFiltroAsync(ProductoFiltroDto filtro)
    {
        // Sanitizar paginación (evita 500 por OFFSET negativo y TotalPaginas=int.MinValue por / 0).
        if (filtro.Pagina is int p && p < 1) filtro.Pagina = 1;
        if (filtro.TamanoPagina is int t && t < 1) filtro.TamanoPagina = 20;
        if (filtro.TamanoPagina is int tt && tt > 200) filtro.TamanoPagina = 200;
        return _repo.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);
    }

    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);

    public Task<bool> ActualizarImagenAsync(int id, string? imagenUrl)
        => _repo.ActualizarImagenAsync(id, imagenUrl, _tenant.TenantId);
}
