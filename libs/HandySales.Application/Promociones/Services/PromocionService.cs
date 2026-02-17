using HandySales.Application.Promociones.DTOs;
using HandySales.Application.Promociones.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Promociones.Services;

public class PromocionService
{
    private readonly IPromocionRepository _repo;
    private readonly ICurrentTenant _tenant;

    public PromocionService(IPromocionRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<PromocionDto>> ObtenerPromocionesAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<PromocionDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearPromocionAsync(PromocionCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId))
            throw new InvalidOperationException("Ya existe una promoción con ese nombre.");

        if (dto.FechaFin <= dto.FechaInicio)
            throw new InvalidOperationException("La fecha de fin debe ser posterior a la fecha de inicio.");

        if (dto.ProductoIds.Count == 0)
            throw new InvalidOperationException("Debe seleccionar al menos un producto.");

        await ValidarTraslapeAsync(dto.ProductoIds, dto.FechaInicio, dto.FechaFin, _tenant.TenantId);

        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarPromocionAsync(int id, PromocionCreateDto dto)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId, id))
            throw new InvalidOperationException("Ya existe una promoción con ese nombre.");

        if (dto.FechaFin <= dto.FechaInicio)
            throw new InvalidOperationException("La fecha de fin debe ser posterior a la fecha de inicio.");

        if (dto.ProductoIds.Count == 0)
            throw new InvalidOperationException("Debe seleccionar al menos un producto.");

        await ValidarTraslapeAsync(dto.ProductoIds, dto.FechaInicio, dto.FechaFin, _tenant.TenantId, id);

        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    private async Task ValidarTraslapeAsync(List<int> productoIds, DateTime fechaInicio, DateTime fechaFin, int tenantId, int? excludeId = null)
    {
        foreach (var productoId in productoIds)
        {
            var existentes = await _repo.ObtenerPromocionesConProductoAsync(productoId, tenantId, excludeId);
            foreach (var promo in existentes)
            {
                if (promo.FechaInicio <= fechaFin && promo.FechaFin >= fechaInicio)
                {
                    var productoNombre = promo.Productos.FirstOrDefault(p => p.ProductoId == productoId)?.ProductoNombre ?? "desconocido";
                    throw new InvalidOperationException(
                        $"El producto '{productoNombre}' ya tiene la promoción '{promo.Nombre}' " +
                        $"activa del {promo.FechaInicio:dd/MM/yyyy} al {promo.FechaFin:dd/MM/yyyy} " +
                        $"que se traslapa con las fechas seleccionadas.");
                }
            }
        }
    }

    public Task<bool> EliminarPromocionAsync(int id)
        => _repo.EliminarAsync(id, _tenant.TenantId);

    public Task<bool> CambiarActivoAsync(int id, bool activo)
        => _repo.CambiarActivoAsync(id, activo, _tenant.TenantId);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId);
}
