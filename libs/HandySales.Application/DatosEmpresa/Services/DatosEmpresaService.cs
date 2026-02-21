using HandySales.Application.DatosEmpresa.DTOs;
using HandySales.Application.DatosEmpresa.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.DatosEmpresa.Services;

public class DatosEmpresaService : IDatosEmpresaService
{
    private readonly IDatosEmpresaRepository _repo;
    private readonly ICurrentTenant _tenant;

    public DatosEmpresaService(IDatosEmpresaRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<DatosEmpresaDto?> GetAsync()
        => _repo.GetByTenantIdAsync(_tenant.TenantId);

    public Task<DatosEmpresaDto> UpdateAsync(DatosEmpresaUpdateDto dto, string actualizadoPor)
        => _repo.CreateOrUpdateAsync(_tenant.TenantId, dto, actualizadoPor);
}
