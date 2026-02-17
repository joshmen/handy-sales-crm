using HandySales.Application.CategoriasProductos.DTOs;
using HandySales.Application.CategoriasProductos.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.CategoriasProductos.Services;

public record DeleteCategoriaProductoResult(bool Success, string? Error = null, int ProductosCount = 0);
public record ToggleCategoriaProductoActivoResult(bool Success, string? Error = null, int ProductosCount = 0);

public class CategoriaProductoService
{
    private readonly ICategoriaProductoRepository _repo;
    private readonly ICurrentTenant _tenant;

    public CategoriaProductoService(ICategoriaProductoRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<CategoriaProductoDto>> ObtenerCategoriasAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<CategoriaProductoDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearCategoriaAsync(CategoriaProductoCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId))
            throw new InvalidOperationException("Ya existe una categoría de productos con ese nombre.");

        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarCategoriaAsync(int id, CategoriaProductoCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId, id))
            throw new InvalidOperationException("Ya existe una categoría de productos con ese nombre.");

        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    public async Task<DeleteCategoriaProductoResult> EliminarCategoriaAsync(int id)
    {
        // Verificar si hay productos usando esta categoría
        var productosCount = await _repo.ContarProductosPorCategoriaAsync(id, _tenant.TenantId);

        if (productosCount > 0)
        {
            return new DeleteCategoriaProductoResult(
                Success: false,
                Error: $"No se puede eliminar la categoría porque tiene {productosCount} producto(s) asociado(s). Primero reasigne o elimine los productos.",
                ProductosCount: productosCount
            );
        }

        var deleted = await _repo.EliminarAsync(id, _tenant.TenantId);

        if (!deleted)
        {
            return new DeleteCategoriaProductoResult(Success: false, Error: "La categoría no existe o no tienes permisos para eliminarla.");
        }

        return new DeleteCategoriaProductoResult(Success: true);
    }

    public async Task<ToggleCategoriaProductoActivoResult> CambiarActivoAsync(int id, bool activo)
    {
        if (!activo)
        {
            var productosActivos = await _repo.ContarProductosActivosPorCategoriaAsync(id, _tenant.TenantId);
            if (productosActivos > 0)
            {
                return new ToggleCategoriaProductoActivoResult(
                    Success: false,
                    Error: $"No se puede desactivar la categoría porque tiene {productosActivos} producto(s) activo(s) asociado(s). Primero desactive o reasigne los productos.",
                    ProductosCount: productosActivos
                );
            }
        }

        var updated = await _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);
        return updated
            ? new ToggleCategoriaProductoActivoResult(Success: true)
            : new ToggleCategoriaProductoActivoResult(Success: false, Error: "La categoría no existe.");
    }

    public async Task<ToggleCategoriaProductoActivoResult> BatchToggleActivoAsync(List<int> ids, bool activo)
    {
        if (!activo)
        {
            var categoriasConProductos = new List<string>();
            foreach (var id in ids)
            {
                var productosActivos = await _repo.ContarProductosActivosPorCategoriaAsync(id, _tenant.TenantId);
                if (productosActivos > 0)
                {
                    var cat = await _repo.ObtenerPorIdAsync(id, _tenant.TenantId);
                    categoriasConProductos.Add($"{cat?.Nombre ?? $"ID {id}"} ({productosActivos} productos)");
                }
            }

            if (categoriasConProductos.Count > 0)
            {
                return new ToggleCategoriaProductoActivoResult(
                    Success: false,
                    Error: $"No se pueden desactivar las siguientes categorías porque tienen productos activos: {string.Join(", ", categoriasConProductos)}",
                    ProductosCount: categoriasConProductos.Count
                );
            }
        }

        var count = await _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
        return new ToggleCategoriaProductoActivoResult(Success: true);
    }
}
