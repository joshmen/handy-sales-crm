using HandySuites.Application.Metas.DTOs;

namespace HandySuites.Application.Metas.Interfaces;

public interface IMetaVendedorRepository
{
    Task<List<MetaVendedorDto>> GetAllAsync(int tenantId, int? usuarioId = null);
    Task<MetaVendedorDto?> GetByIdAsync(int id, int tenantId);
    Task<int> CreateAsync(CreateMetaVendedorDto dto, string creadoPor, int tenantId);
    Task<bool> UpdateAsync(int id, UpdateMetaVendedorDto dto, string actualizadoPor, int tenantId);
    Task<bool> DeleteAsync(int id, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);

    /// <summary>Returns all active metas in the current period for automation evaluation.</summary>
    Task<List<MetaVendedorDto>> GetActivasParaPeriodoAsync(DateTime fecha, int tenantId);
}
