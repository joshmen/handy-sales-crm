using HandySales.Application.Clientes.DTOs;
using HandySales.Application.Clientes.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Clientes.Services;

public class ClienteService
{
    private readonly IClienteRepository _repo;
    private readonly ICurrentTenant _tenant;

    public ClienteService(IClienteRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public async Task<List<ClienteDto>> ObtenerClientesAsync()
    {
        return await _repo.ObtenerPorTenantAsync(_tenant.TenantId);
    }

    public async Task<ClienteDto?> ObtenerPorIdAsync(int id)
    {
        return await _repo.ObtenerPorIdAsync(id, _tenant.TenantId);
    }

    public record CrearClienteResult(bool Success, int Id = 0, string? Error = null);

    public async Task<CrearClienteResult> CrearClienteAsync(ClienteCreateDto dto)
    {
        var existe = await _repo.ExisteNombreEnTenantAsync(dto.Nombre, _tenant.TenantId);
        if (existe)
            return new CrearClienteResult(false, Error: $"Ya existe un cliente con el nombre '{dto.Nombre}'.");

        var id = await _repo.CrearAsync(dto, _tenant.TenantId);
        return new CrearClienteResult(true, id);
    }

    public record ActualizarClienteResult(bool Success, string? Error = null);

    public async Task<ActualizarClienteResult> ActualizarClienteAsync(int id, ClienteCreateDto dto)
    {
        var existe = await _repo.ExisteNombreEnTenantAsync(dto.Nombre, _tenant.TenantId, excludeId: id);
        if (existe)
            return new ActualizarClienteResult(false, Error: $"Ya existe otro cliente con el nombre '{dto.Nombre}'.");

        var updated = await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
        return updated ? new ActualizarClienteResult(true) : new ActualizarClienteResult(false, Error: "Cliente no encontrado.");
    }

    public async Task<bool> EliminarClienteAsync(int id)
    {
        return await _repo.EliminarAsync(id, _tenant.TenantId);
    }

    public async Task<ClientePaginatedResult> ObtenerPorFiltroAsync(ClienteFiltroDto filtro)
    {
        // RBAC: Vendedor solo ve sus clientes asignados (o sin asignar)
        if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin)
        {
            if (int.TryParse(_tenant.UserId, out var vendedorId))
                filtro.VendedorId = vendedorId;
        }

        return await _repo.ObtenerPorFiltroAsync(filtro, _tenant.TenantId);
    }

    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
}
