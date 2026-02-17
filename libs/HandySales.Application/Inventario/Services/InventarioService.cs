using HandySales.Application.Inventario.DTOs;
using HandySales.Application.Inventario.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Inventario.Services;

public class InventarioService
{
    private readonly IInventarioRepository _repo;
    private readonly ICurrentTenant _tenant;

    public InventarioService(IInventarioRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<InventarioDto>> ObtenerInventarioAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<InventarioDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<InventarioDto?> ObtenerPorProductoIdAsync(int productoId)
        => _repo.ObtenerPorProductoIdAsync(productoId, _tenant.TenantId);

    public record CrearInventarioResult(bool Success, int Id = 0, string? Error = null);

    public async Task<CrearInventarioResult> CrearInventarioAsync(InventarioCreateDto dto)
    {
        // Validar que no exista inventario para este producto
        var existente = await _repo.ObtenerPorProductoIdAsync(dto.ProductoId, _tenant.TenantId);
        if (existente != null)
            return new CrearInventarioResult(false, Error: "Este producto ya tiene un registro de inventario. Edítalo en lugar de crear uno nuevo.");

        var id = await _repo.CrearAsync(dto, _tenant.TenantId);
        return new CrearInventarioResult(true, id);
    }

    public Task<bool> ActualizarInventarioAsync(int id, InventarioUpdateDto dto)
        => _repo.ActualizarAsync(id, dto, _tenant.TenantId);

    public Task<bool> EliminarInventarioAsync(int id)
        => _repo.EliminarAsync(id, _tenant.TenantId);

    public Task<InventarioPaginatedResult> ObtenerPorFiltroAsync(InventarioFiltroDto filtro)
        => _repo.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);
}
