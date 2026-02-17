using HandySales.Application.Zonas.DTOs;
using HandySales.Application.Zonas.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Zonas.Services;

public record DeleteZonaResult(bool Success, string? Error = null, int ClientesCount = 0);
public record ToggleZonaActivoResult(bool Success, string? Error = null, int ClientesCount = 0);

public class ZonaService
{
    private readonly IZonaRepository _repo;
    private readonly ICurrentTenant _tenant;

    public ZonaService(IZonaRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<ZonaDto>> ObtenerZonasAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<ZonaDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<int> CrearZonaAsync(CreateZonaDto dto, string creadoPor)
        => _repo.CrearAsync(dto, creadoPor, _tenant.TenantId);

    public Task<bool> ActualizarZonaAsync(int id, UpdateZonaDto dto, string actualizadoPor)
        => _repo.ActualizarAsync(id, dto, actualizadoPor, _tenant.TenantId);

    public async Task<DeleteZonaResult> EliminarZonaAsync(int id)
    {
        // Verificar si hay clientes usando esta zona
        var clientesCount = await _repo.ContarClientesPorZonaAsync(id, _tenant.TenantId);

        if (clientesCount > 0)
        {
            return new DeleteZonaResult(
                Success: false,
                Error: $"No se puede eliminar la zona porque tiene {clientesCount} cliente(s) asociado(s). Primero reasigne o elimine los clientes.",
                ClientesCount: clientesCount
            );
        }

        var deleted = await _repo.EliminarAsync(id, _tenant.TenantId);

        if (!deleted)
        {
            return new DeleteZonaResult(Success: false, Error: "La zona no existe o no tienes permisos para eliminarla.");
        }

        return new DeleteZonaResult(Success: true);
    }

    public async Task<ToggleZonaActivoResult> CambiarActivoAsync(int id, bool activo)
    {
        if (!activo)
        {
            var clientesActivos = await _repo.ContarClientesActivosPorZonaAsync(id, _tenant.TenantId);
            if (clientesActivos > 0)
            {
                return new ToggleZonaActivoResult(
                    Success: false,
                    Error: $"No se puede desactivar la zona porque tiene {clientesActivos} cliente(s) activo(s) asociado(s). Primero desactive o reasigne los clientes.",
                    ClientesCount: clientesActivos
                );
            }
        }

        var updated = await _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);
        return updated
            ? new ToggleZonaActivoResult(Success: true)
            : new ToggleZonaActivoResult(Success: false, Error: "La zona no existe.");
    }

    public async Task<ToggleZonaActivoResult> BatchToggleActivoAsync(List<int> ids, bool activo)
    {
        if (!activo)
        {
            var zonasConClientes = new List<string>();
            foreach (var id in ids)
            {
                var clientesActivos = await _repo.ContarClientesActivosPorZonaAsync(id, _tenant.TenantId);
                if (clientesActivos > 0)
                {
                    var zona = await _repo.ObtenerPorIdAsync(id, _tenant.TenantId);
                    zonasConClientes.Add($"{zona?.Nombre ?? $"ID {id}"} ({clientesActivos} clientes)");
                }
            }

            if (zonasConClientes.Count > 0)
            {
                return new ToggleZonaActivoResult(
                    Success: false,
                    Error: $"No se pueden desactivar las siguientes zonas porque tienen clientes activos: {string.Join(", ", zonasConClientes)}",
                    ClientesCount: zonasConClientes.Count
                );
            }
        }

        var count = await _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
        return new ToggleZonaActivoResult(Success: true);
    }
}
