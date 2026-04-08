using HandySuites.Application.DatosEmpresa.DTOs;

namespace HandySuites.Application.DatosEmpresa.Interfaces;

public interface IDatosEmpresaService
{
    Task<DatosEmpresaDto?> GetAsync();
    Task<DatosEmpresaDto> UpdateAsync(DatosEmpresaUpdateDto dto, string actualizadoPor);
}
