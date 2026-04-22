using HandySuites.Application.Clientes.DTOs;
using HandySuites.Application.Clientes.Interfaces;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Clientes.Services;

public class ClienteService
{
    private readonly IClienteRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly IUsuarioRepository _usuarioRepository;

    public ClienteService(IClienteRepository repo, ICurrentTenant tenant, IUsuarioRepository usuarioRepository)
    {
        _repo = repo;
        _tenant = tenant;
        _usuarioRepository = usuarioRepository;
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

        var fkError = await ValidarReferenciasDelTenantAsync(dto);
        if (fkError is not null)
            return new CrearClienteResult(false, Error: fkError);

        var id = await _repo.CrearAsync(dto, _tenant.TenantId);
        return new CrearClienteResult(true, id);
    }

    public record ActualizarClienteResult(bool Success, string? Error = null);

    public async Task<ActualizarClienteResult> ActualizarClienteAsync(int id, ClienteCreateDto dto)
    {
        var existe = await _repo.ExisteNombreEnTenantAsync(dto.Nombre, _tenant.TenantId, excludeId: id);
        if (existe)
            return new ActualizarClienteResult(false, Error: $"Ya existe otro cliente con el nombre '{dto.Nombre}'.");

        var fkError = await ValidarReferenciasDelTenantAsync(dto);
        if (fkError is not null)
            return new ActualizarClienteResult(false, Error: fkError);

        var updated = await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
        return updated ? new ActualizarClienteResult(true) : new ActualizarClienteResult(false, Error: "Cliente no encontrado.");
    }

    public async Task<bool> EliminarClienteAsync(int id)
    {
        return await _repo.EliminarAsync(id, _tenant.TenantId);
    }

    public async Task<ClientePaginatedResult> ObtenerPorFiltroAsync(ClienteFiltroDto filtro)
    {
        // RBAC: Supervisor ve su equipo, Vendedor solo sus clientes
        List<int>? filterByVendedorIds = null;
        if (_tenant.IsSupervisor)
        {
            var supervisorId = int.Parse(_tenant.UserId);
            var subordinadoIds = await _usuarioRepository.ObtenerSubordinadoIdsAsync(supervisorId, _tenant.TenantId);
            subordinadoIds.Add(supervisorId);
            filterByVendedorIds = subordinadoIds;
        }
        else if (!_tenant.IsAdmin && !_tenant.IsSuperAdmin)
        {
            if (int.TryParse(_tenant.UserId, out var vendedorId))
                filtro.VendedorId = vendedorId;
        }

        return await _repo.ObtenerPorFiltroAsync(filtro, _tenant.TenantId, filterByVendedorIds);
    }

    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);

    public Task<bool> AprobarProspectoAsync(int id)
        => _repo.AprobarProspectoAsync(id, _tenant.TenantId);

    public Task<bool> RechazarProspectoAsync(int id)
        => _repo.RechazarProspectoAsync(id, _tenant.TenantId);

    /// <summary>
    /// Valida que zona, categoría, lista de precios y vendedor del DTO pertenezcan
    /// al tenant actual. Previene cross-tenant leakage y FK 500 downstream.
    /// </summary>
    private async Task<string?> ValidarReferenciasDelTenantAsync(ClienteCreateDto dto)
    {
        if (!await _repo.ExisteZonaEnTenantAsync(dto.IdZona, _tenant.TenantId))
            return "La zona seleccionada no existe o no pertenece a tu empresa.";
        if (!await _repo.ExisteCategoriaEnTenantAsync(dto.CategoriaClienteId, _tenant.TenantId))
            return "La categoría seleccionada no existe o no pertenece a tu empresa.";
        if (dto.ListaPreciosId is int listaId && listaId > 0
            && !await _repo.ExisteListaPreciosEnTenantAsync(listaId, _tenant.TenantId))
            return "La lista de precios seleccionada no existe o no pertenece a tu empresa.";
        return null;
    }
}
