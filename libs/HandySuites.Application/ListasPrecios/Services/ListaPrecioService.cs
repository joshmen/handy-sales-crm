using HandySuites.Application.ListasPrecios.DTOs;
using HandySuites.Application.ListasPrecios.Interfaces;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.ListasPrecios.Services;

public class ListaPrecioService
{
    private readonly IListaPrecioRepository _repo;
    private readonly ICurrentTenant _tenant;

    public ListaPrecioService(IListaPrecioRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<ListaPrecioDto>> ObtenerListasAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<ListaPrecioDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearListaPrecioAsync(ListaPrecioCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId))
            throw new InvalidOperationException("Ya existe una lista de precios con ese nombre.");

        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarListaPrecioAsync(int id, ListaPrecioCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId, id))
            throw new InvalidOperationException("Ya existe una lista de precios con ese nombre.");

        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    public record EliminarListaResult(bool Success, string? Error = null, int PreciosActivos = 0);

    public async Task<EliminarListaResult> EliminarListaPrecioAsync(int id, bool forzar = false)
    {
        // Si la lista tiene precios por producto asociados, bloqueamos por defecto
        // — borrarla dejaría huérfanos en PreciosPorProducto (no hay FK cascade).
        // El user puede pasar forzar=true para limpiar de todas formas (los precios
        // quedarán orfanos pero la tabla tiene query filter por TenantId así que
        // no se expone a otros tenants; en un futuro se puede hacer hard cleanup).
        if (!forzar)
        {
            var preciosActivos = await _repo.ContarPreciosActivosPorListaAsync(id, _tenant.TenantId);
            if (preciosActivos > 0)
                return new EliminarListaResult(false,
                    Error: $"La lista tiene {preciosActivos} precio(s) por producto asociado(s). Elimínalos primero o pasa `?forzar=true`.",
                    PreciosActivos: preciosActivos);
        }
        var ok = await _repo.EliminarAsync(id, _tenant.TenantId);
        return new EliminarListaResult(ok);
    }

    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
}
