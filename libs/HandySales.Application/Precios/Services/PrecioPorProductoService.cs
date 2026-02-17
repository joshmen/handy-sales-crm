using HandySales.Application.Precios.DTOs;
using HandySales.Application.Precios.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Precios.Services;

public class PrecioPorProductoService
{
    private readonly IPrecioPorProductoRepository _repo;
    private readonly ICurrentTenant _tenant;

    public PrecioPorProductoService(IPrecioPorProductoRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<PrecioPorProductoDto>> ObtenerPreciosAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<PrecioPorProductoDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<List<PrecioPorProductoDto>> ObtenerPorListaAsync(int listaPrecioId)
        => _repo.ObtenerPorListaAsync(listaPrecioId, _tenant.TenantId);

    public Task<int> CrearPrecioAsync(PrecioPorProductoCreateDto dto)
        => _repo.CrearAsync(dto, _tenant.TenantId);

    public Task<bool> ActualizarPrecioAsync(int id, PrecioPorProductoCreateDto dto)
        => _repo.ActualizarAsync(id, dto, _tenant.TenantId);

    public Task<bool> EliminarPrecioAsync(int id)
        => _repo.EliminarAsync(id, _tenant.TenantId);
}
