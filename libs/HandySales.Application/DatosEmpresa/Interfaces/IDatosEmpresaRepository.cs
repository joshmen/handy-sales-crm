using HandySales.Application.DatosEmpresa.DTOs;

namespace HandySales.Application.DatosEmpresa.Interfaces;

public interface IDatosEmpresaRepository
{
    Task<DatosEmpresaDto?> GetByTenantIdAsync(int tenantId);
    Task<DatosEmpresaDto> CreateOrUpdateAsync(int tenantId, DatosEmpresaUpdateDto dto, string actualizadoPor);
}
