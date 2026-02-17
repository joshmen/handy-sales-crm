using HandySales.Application.Clientes.DTOs;

namespace HandySales.Application.Clientes.Interfaces;

public interface IClienteRepository
{
    Task<int> CrearAsync(ClienteCreateDto dto, int tenantId);
    Task<List<ClienteDto>> ObtenerPorTenantAsync(int tenantId);
    Task<ClienteDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<bool> ActualizarAsync(int id, ClienteCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<ClientePaginatedResult> ObtenerPorFiltroAsync(ClienteFiltroDto filtro, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
    Task<bool> ExisteNombreEnTenantAsync(string nombre, int tenantId, int? excludeId = null);
}
