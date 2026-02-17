using HandySales.Application.Descuentos.DTOs;
using HandySales.Application.Descuentos.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Descuentos.Services;

public class DescuentoPorCantidadService
{
    private readonly IDescuentoPorCantidadRepository _repo;
    private readonly ICurrentTenant _tenant;

    public DescuentoPorCantidadService(IDescuentoPorCantidadRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<DescuentoPorCantidadDto>> ObtenerDescuentosAsync()
        => _repo.ObtenerPorTenantAsync(_tenant.TenantId);

    public Task<DescuentoPorCantidadDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public Task<List<DescuentoPorCantidadDto>> ObtenerPorProductoIdAsync(int productoId)
        => _repo.ObtenerPorProductoIdAsync(productoId, _tenant.TenantId);

    public async Task<int> CrearDescuentoAsync(DescuentoPorCantidadCreateDto dto)
    {
        int? productoId = dto.TipoAplicacion == "Global" ? null : dto.ProductoId;

        if (await _repo.ExisteCantidadMinimaAsync(productoId, dto.CantidadMinima, _tenant.TenantId))
        {
            var scope = dto.TipoAplicacion == "Global" ? "global" : "para este producto";
            throw new InvalidOperationException(
                $"Ya existe un descuento {scope} con cantidad mínima de {dto.CantidadMinima}.");
        }

        await ValidarEscalaDescuentosAsync(productoId, dto.CantidadMinima, dto.DescuentoPorcentaje, _tenant.TenantId);

        return await _repo.CrearAsync(dto, _tenant.TenantId);
    }

    public async Task<bool> ActualizarDescuentoAsync(int id, DescuentoPorCantidadCreateDto dto)
    {
        var existing = await _repo.ObtenerPorIdAsync(id, _tenant.TenantId);
        if (existing == null) return false;

        int? productoId = existing.ProductoId;

        if (await _repo.ExisteCantidadMinimaAsync(productoId, dto.CantidadMinima, _tenant.TenantId, id))
        {
            var scope = existing.TipoAplicacion == "Global" ? "global" : "para este producto";
            throw new InvalidOperationException(
                $"Ya existe un descuento {scope} con cantidad mínima de {dto.CantidadMinima}.");
        }

        await ValidarEscalaDescuentosAsync(productoId, dto.CantidadMinima, dto.DescuentoPorcentaje, _tenant.TenantId, id);

        return await _repo.ActualizarAsync(id, dto, _tenant.TenantId);
    }

    private async Task ValidarEscalaDescuentosAsync(int? productoId, decimal cantidadMinima, decimal descuentoPorcentaje, int tenantId, int? excludeId = null)
    {
        var escala = await _repo.ObtenerEscalaDescuentosAsync(productoId, tenantId, excludeId);

        if (escala.Count == 0) return;

        var escalaCompleta = escala
            .Select(d => new { d.CantidadMinima, d.DescuentoPorcentaje })
            .Append(new { CantidadMinima = cantidadMinima, DescuentoPorcentaje = descuentoPorcentaje })
            .OrderBy(d => d.CantidadMinima)
            .ToList();

        for (int i = 1; i < escalaCompleta.Count; i++)
        {
            if (escalaCompleta[i].DescuentoPorcentaje <= escalaCompleta[i - 1].DescuentoPorcentaje)
            {
                throw new InvalidOperationException(
                    $"Escala de descuentos inconsistente: la cantidad mínima {escalaCompleta[i].CantidadMinima} " +
                    $"tiene un descuento igual o menor ({escalaCompleta[i].DescuentoPorcentaje}%) " +
                    $"que la cantidad {escalaCompleta[i - 1].CantidadMinima} ({escalaCompleta[i - 1].DescuentoPorcentaje}%). " +
                    $"Una mayor cantidad debe tener un descuento estrictamente mayor.");
            }
        }
    }

    public Task<bool> EliminarDescuentoAsync(int id)
        => _repo.EliminarAsync(id, _tenant.TenantId);

    public Task<bool> ToggleActivoAsync(int id, string? usuarioActual = null)
        => _repo.ToggleActivoAsync(id, _tenant.TenantId, usuarioActual);

    public Task<int> BatchToggleActivoAsync(List<int> ids, bool activo, string? usuarioActual = null)
        => _repo.BatchToggleActivoAsync(ids, activo, _tenant.TenantId, usuarioActual);
}
