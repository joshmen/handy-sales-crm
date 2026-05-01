using HandySuites.Application.Impuestos.DTOs;
using HandySuites.Application.Impuestos.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Impuestos.Services;

/// <summary>
/// CRUD de tasas de impuesto. Constraints:
/// - Solo una tasa puede tener EsDefault=true por tenant. Service lo asegura
///   llamando UnsetDefaultExceptAsync en cada save.
/// - Tasa debe estar entre 0.00 y 1.00 (porcentaje decimal).
/// - Borrar una tasa pone Productos.TasaImpuestoId = NULL (FK SetNull) — los
///   productos caen al default tenant en runtime.
///
/// Cascade denormalization: Producto.Tasa está denormalizada para evitar lookup
/// offline en mobile. Cualquier cambio en TasaImpuesto.Tasa o cambio de default
/// debe propagarse a los productos afectados, tocando ActualizadoEn para que
/// el siguiente sync los baje al device.
/// </summary>
public class TasaImpuestoService
{
    private readonly ITasaImpuestoRepository _repo;
    private readonly ICurrentTenant _tenant;

    public TasaImpuestoService(ITasaImpuestoRepository repo, ICurrentTenant tenant)
    {
        _repo = repo;
        _tenant = tenant;
    }

    public Task<List<TasaImpuestoDto>> ObtenerTodasAsync(bool incluirInactivas = false)
        => _repo.ObtenerTodasAsync(_tenant.TenantId, incluirInactivas);

    public Task<TasaImpuestoDto?> ObtenerPorIdAsync(int id)
        => _repo.ObtenerPorIdAsync(id, _tenant.TenantId);

    public async Task<int> CrearAsync(TasaImpuestoCreateDto dto)
    {
        ValidarTasa(dto.Tasa);
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            throw new InvalidOperationException("El nombre de la tasa es requerido.");

        var entity = new TasaImpuesto
        {
            TenantId = _tenant.TenantId,
            Nombre = dto.Nombre.Trim(),
            Tasa = dto.Tasa,
            EsDefault = dto.EsDefault,
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = _tenant.UserId
        };

        var id = await _repo.CrearAsync(entity);

        if (dto.EsDefault)
        {
            await _repo.UnsetDefaultExceptAsync(_tenant.TenantId, id);
            // Productos sin FK heredan el nuevo default → propagar denormalización.
            await _repo.PropagarTasaADefaultProductosAsync(_tenant.TenantId, dto.Tasa);
        }

        return id;
    }

    public async Task<bool> ActualizarAsync(int id, TasaImpuestoUpdateDto dto)
    {
        var entity = await _repo.ObtenerEntidadAsync(id, _tenant.TenantId);
        if (entity is null) return false;

        var tasaCambio = false;
        var nuevaTasa = entity.Tasa;
        if (!string.IsNullOrWhiteSpace(dto.Nombre)) entity.Nombre = dto.Nombre.Trim();
        if (dto.Tasa.HasValue && dto.Tasa.Value != entity.Tasa)
        {
            ValidarTasa(dto.Tasa.Value);
            entity.Tasa = dto.Tasa.Value;
            nuevaTasa = dto.Tasa.Value;
            tasaCambio = true;
        }
        if (dto.Activo.HasValue) entity.Activo = dto.Activo.Value;

        var setDefault = false;
        if (dto.EsDefault.HasValue && dto.EsDefault.Value != entity.EsDefault)
        {
            entity.EsDefault = dto.EsDefault.Value;
            setDefault = dto.EsDefault.Value;
        }

        entity.ActualizadoEn = DateTime.UtcNow;
        entity.ActualizadoPor = _tenant.UserId;

        var ok = await _repo.ActualizarAsync(entity);
        if (!ok) return false;

        // Cascade denormalización: si cambió la tasa, propagar a productos con esta FK.
        if (tasaCambio)
            await _repo.PropagarTasaAProductosAsync(_tenant.TenantId, id, nuevaTasa);

        if (setDefault)
        {
            await _repo.UnsetDefaultExceptAsync(_tenant.TenantId, id);
            // Productos sin FK heredan la nueva tasa default → refrescar denormalización.
            await _repo.PropagarTasaADefaultProductosAsync(_tenant.TenantId, nuevaTasa);
        }

        return true;
    }

    public async Task<bool> EliminarAsync(int id)
    {
        var entity = await _repo.ObtenerEntidadAsync(id, _tenant.TenantId);
        if (entity is null) return false;

        var eraDefault = entity.EsDefault;
        var ok = await _repo.EliminarAsync(id, _tenant.TenantId);
        if (!ok) return false;

        // Tras el soft-delete: productos con esa FK quedan con FK NULL (ON DELETE SetNull).
        // Refrescar Producto.Tasa al default actual del tenant.
        if (eraDefault)
        {
            // Era default: ahora no hay default explícito hasta que admin marque otra.
            // Caída a 0 sería incorrecta — mantener el último valor conocido en producto.
            // Cuando admin elija otra tasa default, el cascade en Actualizar la propagará.
        }
        else
        {
            var defaultTasa = await _repo.ObtenerDefaultAsync(_tenant.TenantId);
            var tasaFallback = defaultTasa?.Tasa ?? 0.16m;
            // Productos que apuntaban a la tasa eliminada quedan TasaImpuestoId=NULL → propagar.
            await _repo.PropagarTasaADefaultProductosAsync(_tenant.TenantId, tasaFallback);
        }

        return true;
    }

    private static void ValidarTasa(decimal tasa)
    {
        if (tasa < 0m || tasa > 1m)
            throw new InvalidOperationException(
                "La tasa debe ser un decimal entre 0.00 y 1.00 (ej. 0.16 para 16%).");
    }
}
