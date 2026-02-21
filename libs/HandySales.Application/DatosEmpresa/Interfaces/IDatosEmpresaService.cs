using HandySales.Application.DatosEmpresa.DTOs;

namespace HandySales.Application.DatosEmpresa.Interfaces;

public interface IDatosEmpresaService
{
    Task<DatosEmpresaDto?> GetAsync();
    Task<DatosEmpresaDto> UpdateAsync(DatosEmpresaUpdateDto dto, string actualizadoPor);
}
