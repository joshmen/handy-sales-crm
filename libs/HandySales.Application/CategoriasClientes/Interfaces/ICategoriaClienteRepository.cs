using HandySales.Application.CategoriasClientes.DTOs;

namespace HandySales.Application.CategoriasClientes.Interfaces;

public interface ICategoriaClienteRepository
{
    Task<List<CategoriaClienteDto>> ObtenerPorTenantAsync(int tenantId);
    Task<CategoriaClienteDto?> ObtenerPorIdAsync(int id, int tenantId);
    Task<int> CrearAsync(CategoriaClienteCreateDto dto, int tenantId);
    Task<bool> ActualizarAsync(int id, CategoriaClienteCreateDto dto, int tenantId);
    Task<bool> EliminarAsync(int id, int tenantId);
    Task<int> ContarClientesPorCategoriaAsync(int categoriaId, int tenantId);
    Task<int> ContarClientesActivosPorCategoriaAsync(int categoriaId, int tenantId);
    Task<bool> CambiarActivoAsync(int id, bool activo, int tenantId);
    Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, int tenantId);
}
