using HandySales.Application.ListasPrecios.DTOs;
using HandySales.Application.ListasPrecios.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.ListasPrecios.Services;

public class ListaPrecioService
{
    private readonly IListaPrecioRepository _repo;
    private readonly ICurrentTenant _tenant;

    public ListaPrecioService(IListaPrecioRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<ListaPrecioDto>> ObtenerListasAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<ListaPrecioDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearListaPrecioAsync(ListaPrecioCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId))
            throw new InvalidOperationException("Ya existe una lista de precios con ese nombre.");

        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarListaPrecioAsync(int id, ListaPrecioCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId, id))
            throw new InvalidOperationException("Ya existe una lista de precios con ese nombre.");

        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    public Task<bool> EliminarListaPrecioAsync(int id)
        => _repo.EliminarAsync(id, _tenant.TenantId);

    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
}
