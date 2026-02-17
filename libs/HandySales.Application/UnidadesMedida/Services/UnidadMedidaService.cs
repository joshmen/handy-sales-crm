using HandySales.Application.UnidadesMedida.DTOs;
using HandySales.Application.UnidadesMedida.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.UnidadesMedida.Services;

public record DeleteUnidadMedidaResult(bool Success, string? Error = null, int ProductosCount = 0);
public record ToggleUnidadMedidaActivoResult(bool Success, string? Error = null, int ProductosCount = 0);

public class UnidadMedidaService
{
    private readonly IUnidadMedidaRepository _repo;
    private readonly ICurrentTenant _tenant;

    public UnidadMedidaService(IUnidadMedidaRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<UnidadMedidaDto>> ObtenerUnidadesAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<UnidadMedidaDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearUnidadAsync(UnidadMedidaCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId))
            throw new InvalidOperationException("Ya existe una unidad de medida con ese nombre.");

        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarUnidadAsync(int id, UnidadMedidaCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId, id))
            throw new InvalidOperationException("Ya existe una unidad de medida con ese nombre.");

        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    public async Task<DeleteUnidadMedidaResult> EliminarUnidadAsync(int id)
    {
        // Verificar si hay productos usando esta unidad de medida
        var productosCount = await _repo.ContarProductosPorUnidadAsync(id, _tenant.TenantId);

        if (productosCount > 0)
        {
            return new DeleteUnidadMedidaResult(
                Success: false,
                Error: $"No se puede eliminar la unidad de medida porque tiene {productosCount} producto(s) asociado(s). Primero reasigne o elimine los productos.",
                ProductosCount: productosCount
            );
        }

        var deleted = await _repo.EliminarAsync(id, _tenant.TenantId);

        if (!deleted)
        {
            return new DeleteUnidadMedidaResult(Success: false, Error: "La unidad de medida no existe o no tienes permisos para eliminarla.");
        }

        return new DeleteUnidadMedidaResult(Success: true);
    }

    public async Task<ToggleUnidadMedidaActivoResult> CambiarActivoAsync(int id, bool activo)
    {
        if (!activo)
        {
            var productosActivos = await _repo.ContarProductosActivosPorUnidadAsync(id, _tenant.TenantId);
            if (productosActivos > 0)
            {
                return new ToggleUnidadMedidaActivoResult(
                    Success: false,
                    Error: $"No se puede desactivar la unidad de medida porque tiene {productosActivos} producto(s) activo(s) asociado(s). Primero desactive o reasigne los productos.",
                    ProductosCount: productosActivos
                );
            }
        }

        var updated = await _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);
        return updated
            ? new ToggleUnidadMedidaActivoResult(Success: true)
            : new ToggleUnidadMedidaActivoResult(Success: false, Error: "La unidad de medida no existe.");
    }

    public async Task<ToggleUnidadMedidaActivoResult> BatchToggleActivoAsync(List<int> ids, bool activo)
    {
        if (!activo)
        {
            var unidadesConProductos = new List<string>();
            foreach (var id in ids)
            {
                var productosActivos = await _repo.ContarProductosActivosPorUnidadAsync(id, _tenant.TenantId);
                if (productosActivos > 0)
                {
                    var unidad = await _repo.ObtenerPorIdAsync(id, _tenant.TenantId);
                    unidadesConProductos.Add($"{unidad?.Nombre ?? $"ID {id}"} ({productosActivos} productos)");
                }
            }

            if (unidadesConProductos.Count > 0)
            {
                return new ToggleUnidadMedidaActivoResult(
                    Success: false,
                    Error: $"No se pueden desactivar las siguientes unidades porque tienen productos activos: {string.Join(", ", unidadesConProductos)}",
                    ProductosCount: unidadesConProductos.Count
                );
            }
        }

        var count = await _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
        return new ToggleUnidadMedidaActivoResult(Success: true);
    }
}
