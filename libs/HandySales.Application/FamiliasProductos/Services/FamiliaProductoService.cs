using HandySales.Application.FamiliasProductos.DTOs;
using HandySales.Application.FamiliasProductos.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.FamiliasProductos.Services;

public record DeleteFamiliaProductoResult(bool Success, string? Error = null, int ProductosCount = 0);
public record ToggleActivoResult(bool Success, string? Error = null, int ProductosCount = 0);

public class FamiliaProductoService
{
    private readonly IFamiliaProductoRepository _repo;
    private readonly ICurrentTenant _tenant;

    public FamiliaProductoService(IFamiliaProductoRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<FamiliaProductoDto>> ObtenerFamiliasAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<FamiliaProductoDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearFamiliaAsync(FamiliaProductoCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId))
            throw new InvalidOperationException("Ya existe una familia de productos con ese nombre.");

        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarFamiliaAsync(int id, FamiliaProductoCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId, id))
            throw new InvalidOperationException("Ya existe una familia de productos con ese nombre.");

        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    public async Task<DeleteFamiliaProductoResult> EliminarFamiliaAsync(int id)
    {
        // Verificar si hay productos usando esta familia
        var productosCount = await _repo.ContarProductosPorFamiliaAsync(id, _tenant.TenantId);

        if (productosCount > 0)
        {
            return new DeleteFamiliaProductoResult(
                Success: false,
                Error: $"No se puede eliminar la familia porque tiene {productosCount} producto(s) asociado(s). Primero reasigne o elimine los productos.",
                ProductosCount: productosCount
            );
        }

        var deleted = await _repo.EliminarAsync(id, _tenant.TenantId);

        if (!deleted)
        {
            return new DeleteFamiliaProductoResult(Success: false, Error: "La familia no existe o no tienes permisos para eliminarla.");
        }

        return new DeleteFamiliaProductoResult(Success: true);
    }

    public async Task<ToggleActivoResult> CambiarActivoAsync(int id, bool activo)
    {
        // Al desactivar, verificar si tiene productos activos
        if (!activo)
        {
            var productosActivos = await _repo.ContarProductosActivosPorFamiliaAsync(id, _tenant.TenantId);
            if (productosActivos > 0)
            {
                return new ToggleActivoResult(
                    Success: false,
                    Error: $"No se puede desactivar la familia porque tiene {productosActivos} producto(s) activo(s) asociado(s). Primero desactive o reasigne los productos.",
                    ProductosCount: productosActivos
                );
            }
        }

        var updated = await _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);
        return updated
            ? new ToggleActivoResult(Success: true)
            : new ToggleActivoResult(Success: false, Error: "La familia no existe.");
    }

    public async Task<ToggleActivoResult> BatchToggleActivoAsync(List<int> ids, bool activo)
    {
        // Al desactivar en lote, verificar cada familia
        if (!activo)
        {
            var familiasConProductos = new List<string>();
            foreach (var id in ids)
            {
                var productosActivos = await _repo.ContarProductosActivosPorFamiliaAsync(id, _tenant.TenantId);
                if (productosActivos > 0)
                {
                    var familia = await _repo.ObtenerPorIdAsync(id, _tenant.TenantId);
                    familiasConProductos.Add($"{familia?.Nombre ?? $"ID {id}"} ({productosActivos} productos)");
                }
            }

            if (familiasConProductos.Count > 0)
            {
                return new ToggleActivoResult(
                    Success: false,
                    Error: $"No se pueden desactivar las siguientes familias porque tienen productos activos: {string.Join(", ", familiasConProductos)}",
                    ProductosCount: familiasConProductos.Count
                );
            }
        }

        var count = await _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
        return new ToggleActivoResult(Success: true);
    }
}
