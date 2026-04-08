using HandySuites.Application.DatosEmpresa.DTOs;

namespace HandySuites.Application.DatosEmpresa.Interfaces;

public interface IDatosEmpresaRepository
{
    Task<DatosEmpresaDto?> GetByTenantIdAsync(int tenantId);
    Task<DatosEmpresaDto> CreateOrUpdateAsync(int tenantId, DatosEmpresaUpdateDto dto, string actualizadoPor);
}
