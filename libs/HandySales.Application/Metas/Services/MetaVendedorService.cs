using HandySales.Application.Metas.DTOs;
using HandySales.Application.Metas.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Metas.Services;

public class MetaVendedorService
{
    private readonly IMetaVendedorRepository _repo;
    private readonly ICurrentTenant _tenant;

    public MetaVendedorService(IMetaVendedorRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<MetaVendedorDto>> GetAllAsync(int? usuarioId = null)
        => _repo.GetAllAsync(_tenant.TenantId, usuarioId);

    public Task<MetaVendedorDto?> GetByIdAsync(int id)
        => _repo.GetByIdAsync(id, _tenant.TenantId);

    public Task<int> CreateAsync(CreateMetaVendedorDto dto, string creadoPor)
        => _repo.CreateAsync(dto, creadoPor, _tenant.TenantId);

    public Task<bool> UpdateAsync(int id, UpdateMetaVendedorDto dto, string actualizadoPor)
        => _repo.UpdateAsync(id, dto, actualizadoPor, _tenant.TenantId);

    public Task<bool> DeleteAsync(int id)
        => _repo.DeleteAsync(id, _tenant.TenantId);

    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);

    public Task<List<MetaVendedorDto>> GetActivasParaPeriodoAsync(DateTime fecha)
        => _repo.GetActivasParaPeriodoAsync(fecha, _tenant.TenantId);
}
