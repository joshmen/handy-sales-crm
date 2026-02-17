using HandySales.Application.Productos.DTOs;
using HandySales.Application.Productos.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Productos.Services;

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

    public Task<int> CrearProductoAsync(ProductoCreateDto dto)
        => _repo.CrearAsync(dto, _tenant.TenantId);

    public Task<bool> ActualizarProductoAsync(int id, ProductoCreateDto dto)
        => _repo.ActualizarAsync(id, dto, _tenant.TenantId);

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
