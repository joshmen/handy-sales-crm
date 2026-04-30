using HandySuites.Application.Promociones.DTOs;
using HandySuites.Application.Promociones.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Promociones.Services;

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
        await ValidarBaseAsync(dto, excludeId: null);
        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarPromocionAsync(int id, PromocionCreateDto dto)
    {
        await ValidarBaseAsync(dto, excludeId: id);
        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    private async Task ValidarBaseAsync(PromocionCreateDto dto, int? excludeId)
    {
        if (await _repo.ExisteNombreAsync(dto.Nombre, _tenant.TenantId, excludeId))
            throw new InvalidOperationException("Ya existe una promoción con ese nombre.");

        if (dto.FechaFin <= dto.FechaInicio)
            throw new InvalidOperationException("La fecha de fin debe ser posterior a la fecha de inicio.");

        if (dto.ProductoIds.Count == 0)
            throw new InvalidOperationException("Debe seleccionar al menos un producto.");

        ValidarTipo(dto);

        await ValidarProductosExistenAsync(dto.ProductoIds, _tenant.TenantId);

        // El traslape también incluye el producto bonificado (cuando el regalo es
        // distinto al comprado). Sin esto, dos promos podrían bonificar el mismo
        // producto Y simultáneamente y aplicar 2 regalos al mismo SKU.
        var idsTraslape = new List<int>(dto.ProductoIds);
        if (dto.TipoPromocion == TipoPromocion.Regalo
            && dto.ProductoBonificadoId.HasValue
            && !idsTraslape.Contains(dto.ProductoBonificadoId.Value))
        {
            idsTraslape.Add(dto.ProductoBonificadoId.Value);
        }
        await ValidarTraslapeAsync(idsTraslape, dto.FechaInicio, dto.FechaFin, _tenant.TenantId, excludeId);
    }

    private static void ValidarTipo(PromocionCreateDto dto)
    {
        if (dto.TipoPromocion == TipoPromocion.Porcentaje)
        {
            if (dto.DescuentoPorcentaje <= 0 || dto.DescuentoPorcentaje > 100)
                throw new InvalidOperationException("El descuento debe ser un porcentaje entre 1 y 100.");
            return;
        }

        // TipoPromocion.Regalo (BOGO)
        if (!dto.CantidadCompra.HasValue || dto.CantidadCompra.Value <= 0)
            throw new InvalidOperationException("La cantidad de compra debe ser mayor a 0.");
        if (!dto.CantidadBonificada.HasValue || dto.CantidadBonificada.Value <= 0)
            throw new InvalidOperationException("La cantidad bonificada debe ser mayor a 0.");
        if (dto.ProductoBonificadoId.HasValue && dto.ProductoIds.Contains(dto.ProductoBonificadoId.Value))
        {
            // Si el producto bonificado es uno de los productos de la promo, debería
            // ser "mismo producto" (ProductoBonificadoId = null). Evitamos ambigüedad.
            throw new InvalidOperationException(
                "El producto bonificado no puede ser uno de los productos de la promoción. " +
                "Para regalar el mismo producto, deja 'producto bonificado' vacío.");
        }
    }

    private async Task ValidarProductosExistenAsync(List<int> productoIds, int tenantId)
    {
        var missing = await _repo.ObtenerProductosFaltantesAsync(productoIds, tenantId);
        if (missing.Count > 0)
            throw new InvalidOperationException(
                $"Los productos con IDs {string.Join(", ", missing)} no existen o no pertenecen a tu empresa.");
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
