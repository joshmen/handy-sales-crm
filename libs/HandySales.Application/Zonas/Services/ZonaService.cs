using HandySuites.Application.Zonas.DTOs;
using HandySuites.Application.Zonas.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Zonas.Services;

public record DeleteZonaResult(bool Success, string? Error = null, int ClientesCount = 0);
public record ToggleZonaActivoResult(bool Success, string? Error = null, int ClientesCount = 0);
public record ZonaMutationResult(bool Success, string? Error = null, int Id = 0);

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

    public async Task<ZonaMutationResult> CrearZonaAsync(CreateZonaDto dto, string creadoPor)
    {
        var coordError = ValidarCoordenadas(dto.CentroLatitud, dto.CentroLongitud, dto.RadioKm);
        if (coordError != null)
            return new ZonaMutationResult(false, coordError);

        if (dto.CentroLatitud.HasValue && dto.CentroLongitud.HasValue && dto.RadioKm.HasValue)
        {
            var overlapError = await ValidarSolapamiento(
                dto.Nombre, dto.CentroLatitud.Value, dto.CentroLongitud.Value, dto.RadioKm.Value, excludeId: null);
            if (overlapError != null)
                return new ZonaMutationResult(false, overlapError);
        }

        var id = await _repo.CrearAsync(dto, creadoPor, _tenant.TenantId);
        return new ZonaMutationResult(true, Id: id);
    }

    public async Task<ZonaMutationResult> ActualizarZonaAsync(int id, UpdateZonaDto dto, string actualizadoPor)
    {
        var coordError = ValidarCoordenadas(dto.CentroLatitud, dto.CentroLongitud, dto.RadioKm);
        if (coordError != null)
            return new ZonaMutationResult(false, coordError);

        if (dto.CentroLatitud.HasValue && dto.CentroLongitud.HasValue && dto.RadioKm.HasValue)
        {
            var overlapError = await ValidarSolapamiento(
                dto.Nombre, dto.CentroLatitud.Value, dto.CentroLongitud.Value, dto.RadioKm.Value, excludeId: id);
            if (overlapError != null)
                return new ZonaMutationResult(false, overlapError);
        }

        var updated = await _repo.ActualizarAsync(id, dto, actualizadoPor, _tenant.TenantId);
        return updated
            ? new ZonaMutationResult(true, Id: id)
            : new ZonaMutationResult(false, "La zona no existe o no tienes permisos para editarla.");
    }

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

    // --- Validation helpers ---

    private static string? ValidarCoordenadas(double? lat, double? lng, double? radioKm)
    {
        bool hasLat = lat.HasValue;
        bool hasLng = lng.HasValue;

        if (hasLat != hasLng)
            return "Si se especifica latitud, también se debe especificar longitud (y viceversa).";

        if (hasLat && hasLng)
        {
            if (lat!.Value < 14.0 || lat.Value > 33.0)
                return $"La latitud debe estar entre 14.0 y 33.0 (límites de México). Valor recibido: {lat.Value}";

            if (lng!.Value < -118.0 || lng.Value > -86.0)
                return $"La longitud debe estar entre -118.0 y -86.0 (límites de México). Valor recibido: {lng.Value}";
        }

        if (radioKm.HasValue)
        {
            if (radioKm.Value <= 0 || radioKm.Value > 100)
                return "El radio debe ser mayor a 0 y menor o igual a 100 km.";

            if (!hasLat || !hasLng)
                return "Si se especifica radio, también se deben especificar latitud y longitud.";
        }

        return null;
    }

    private async Task<string?> ValidarSolapamiento(string nombre, double lat, double lng, double radioKm, int? excludeId)
    {
        var existingZones = await _repo.ObtenerZonasConCoordenadasAsync(_tenant.TenantId, excludeId);

        foreach (var (_, existNombre, existLat, existLng, existRadio) in existingZones)
        {
            var distance = HaversineDistanceKm(lat, lng, existLat, existLng);
            var sumRadios = radioKm + existRadio;

            if (distance < sumRadios)
            {
                var overlap = sumRadios - distance;
                return $"La zona '{nombre}' se traslapa con la zona '{existNombre}' (distancia: {distance:F1} km, solapamiento: {overlap:F1} km)";
            }
        }

        return null;
    }

    private static double HaversineDistanceKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371; // Earth radius in km
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}
