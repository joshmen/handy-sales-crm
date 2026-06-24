using HandySuites.Application.Vehiculos.DTOs;
using HandySuites.Application.Vehiculos.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Vehiculos.Services;

public record DeleteVehiculoResult(bool Success, string? Error = null);
public record ToggleVehiculoActivoResult(bool Success, string? Error = null);
public record VehiculoMutationResult(bool Success, string? Error = null, int Id = 0);

public class VehiculoService
{
    private readonly IVehiculoRepository _repo;
    private readonly ICurrentTenant _tenant;

    public VehiculoService(IVehiculoRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<VehiculoDto>> ObtenerVehiculosAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<VehiculoDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<VehiculoMutationResult> CrearVehiculoAsync(CreateVehiculoDto dto, string creadoPor)
    {
        // Unicidad de placa dentro del tenant (case-insensitive).
        if (await _repo.ExistePlacaEnTenantAsync(dto.Placa.Trim(), _tenant.TenantId))
            return new VehiculoMutationResult(false, "Ya existe un vehículo con esa placa.");

        if (dto.VendedorId.HasValue && !await _repo.EsVendedorDelTenantAsync(dto.VendedorId.Value, _tenant.TenantId))
            return new VehiculoMutationResult(false, "El vendedor seleccionado no existe o no tiene rol VENDEDOR.");

        var id = await _repo.CrearAsync(dto, creadoPor, _tenant.TenantId);
        return new VehiculoMutationResult(true, Id: id);
    }

    public async Task<VehiculoMutationResult> ActualizarVehiculoAsync(int id, UpdateVehiculoDto dto, string actualizadoPor)
    {
        if (await _repo.ExistePlacaEnTenantAsync(dto.Placa.Trim(), _tenant.TenantId, excludeId: id))
            return new VehiculoMutationResult(false, "Ya existe otro vehículo con esa placa.");

        if (dto.VendedorId.HasValue && !await _repo.EsVendedorDelTenantAsync(dto.VendedorId.Value, _tenant.TenantId))
            return new VehiculoMutationResult(false, "El vendedor seleccionado no existe o no tiene rol VENDEDOR.");

        var updated = await _repo.ActualizarAsync(id, dto, actualizadoPor, _tenant.TenantId);
        return updated
            ? new VehiculoMutationResult(true, Id: id)
            : new VehiculoMutationResult(false, "El vehículo no existe o no tienes permisos para editarlo.");
    }

    public async Task<DeleteVehiculoResult> EliminarVehiculoAsync(int id)
    {
        var deleted = await _repo.EliminarAsync(id, _tenant.TenantId);
        return deleted
            ? new DeleteVehiculoResult(Success: true)
            : new DeleteVehiculoResult(Success: false, Error: "El vehículo no existe o no tienes permisos para eliminarlo.");
    }

    public async Task<ToggleVehiculoActivoResult> CambiarActivoAsync(int id, bool activo)
    {
        var updated = await _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);
        return updated
            ? new ToggleVehiculoActivoResult(Success: true)
            : new ToggleVehiculoActivoResult(Success: false, Error: "El vehículo no existe.");
    }

    public async Task<ToggleVehiculoActivoResult> BatchToggleActivoAsync(List<int> ids, bool activo)
    {
        await _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
        return new ToggleVehiculoActivoResult(Success: true);
    }
}
