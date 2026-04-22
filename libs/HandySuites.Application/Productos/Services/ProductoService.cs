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
        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarProductoAsync(int id, ProductoCreateDto dto)
    {
        await ValidarCatalogosFkAsync(dto);
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

    public Task<bool> EliminarProductoAsync(int id)
        => _repo.EliminarAsync(id, _tenant.TenantId);

    public Task<ProductoPaginatedResult> ObtenerPorFiltroAsync(ProductoFiltroDto filtro)
        => _repo.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);

    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);

    public Task<bool> ActualizarImagenAsync(int id, string? imagenUrl)
        => _repo.ActualizarImagenAsync(id, imagenUrl, _tenant.TenantId);
}
