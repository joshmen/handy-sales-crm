using HandySales.Application.CategoriasClientes.DTOs;
using HandySales.Application.CategoriasClientes.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.CategoriasClientes.Services;

public record DeleteCategoriaResult(bool Success, string? Error = null, int ClientesCount = 0);
public record ToggleCategoriaClienteActivoResult(bool Success, string? Error = null, int ClientesCount = 0);

public class CategoriaClienteService
{
    private readonly ICategoriaClienteRepository _repo;
    private readonly ICurrentTenant _tenant;

    public CategoriaClienteService(ICategoriaClienteRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<CategoriaClienteDto>> ObtenerCategoriasAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<CategoriaClienteDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<int> CrearCategoriaAsync(CategoriaClienteCreateDto dto)
        => _repo.CrearAsync(dto, _tenant.TenantId);

    public Task<bool> ActualizarCategoriaAsync(int id, CategoriaClienteCreateDto dto)
        => _repo.ActualizarAsync(id, dto, _tenant.TenantId);

    public async Task<DeleteCategoriaResult> EliminarCategoriaAsync(int id)
    {
        // Verificar si hay clientes usando esta categoría
        var clientesCount = await _repo.ContarClientesPorCategoriaAsync(id, _tenant.TenantId);

        if (clientesCount > 0)
        {
            return new DeleteCategoriaResult(
                Success: false,
                Error: $"No se puede eliminar la categoría porque tiene {clientesCount} cliente(s) asociado(s). Primero reasigne o elimine los clientes.",
                ClientesCount: clientesCount
            );
        }

        var deleted = await _repo.EliminarAsync(id, _tenant.TenantId);

        if (!deleted)
        {
            return new DeleteCategoriaResult(Success: false, Error: "La categoría no existe o no tienes permisos para eliminarla.");
        }

        return new DeleteCategoriaResult(Success: true);
    }

    public async Task<ToggleCategoriaClienteActivoResult> CambiarActivoAsync(int id, bool activo)
    {
        if (!activo)
        {
            var clientesActivos = await _repo.ContarClientesActivosPorCategoriaAsync(id, _tenant.TenantId);
            if (clientesActivos > 0)
            {
                return new ToggleCategoriaClienteActivoResult(
                    Success: false,
                    Error: $"No se puede desactivar la categoría porque tiene {clientesActivos} cliente(s) activo(s) asociado(s). Primero desactive o reasigne los clientes.",
                    ClientesCount: clientesActivos
                );
            }
        }

        var updated = await _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);
        return updated
            ? new ToggleCategoriaClienteActivoResult(Success: true)
            : new ToggleCategoriaClienteActivoResult(Success: false, Error: "La categoría no existe.");
    }

    public async Task<ToggleCategoriaClienteActivoResult> BatchToggleActivoAsync(List<int> ids, bool activo)
    {
        if (!activo)
        {
            var categoriasConClientes = new List<string>();
            foreach (var id in ids)
            {
                var clientesActivos = await _repo.ContarClientesActivosPorCategoriaAsync(id, _tenant.TenantId);
                if (clientesActivos > 0)
                {
                    var cat = await _repo.ObtenerPorIdAsync(id, _tenant.TenantId);
                    categoriasConClientes.Add($"{cat?.Nombre ?? $"ID {id}"} ({clientesActivos} clientes)");
                }
            }

            if (categoriasConClientes.Count > 0)
            {
                return new ToggleCategoriaClienteActivoResult(
                    Success: false,
                    Error: $"No se pueden desactivar las siguientes categorías porque tienen clientes activos: {string.Join(", ", categoriasConClientes)}",
                    ClientesCount: categoriasConClientes.Count
                );
            }
        }

        var count = await _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
        return new ToggleCategoriaClienteActivoResult(Success: true);
    }
}
