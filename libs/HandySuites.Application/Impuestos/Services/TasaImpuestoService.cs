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
            ClaveSat = string.IsNullOrWhiteSpace(dto.ClaveSat) ? "002" : dto.ClaveSat,
            TipoImpuesto = string.IsNullOrWhiteSpace(dto.TipoImpuesto) ? "Traslado" : dto.TipoImpuesto,
            EsDefault = dto.EsDefault,
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = _tenant.UserId
        };

        var id = await _repo.CrearAsync(entity);

        // Si esta tasa es default, desmarcar las demás del tenant.
        if (dto.EsDefault)
            await _repo.UnsetDefaultExceptAsync(_tenant.TenantId, id);

        return id;
    }

    public async Task<bool> ActualizarAsync(int id, TasaImpuestoUpdateDto dto)
    {
        var entity = await _repo.ObtenerEntidadAsync(id, _tenant.TenantId);
        if (entity is null) return false;

        if (!string.IsNullOrWhiteSpace(dto.Nombre)) entity.Nombre = dto.Nombre.Trim();
        if (dto.Tasa.HasValue)
        {
            ValidarTasa(dto.Tasa.Value);
            entity.Tasa = dto.Tasa.Value;
        }
        if (!string.IsNullOrWhiteSpace(dto.ClaveSat)) entity.ClaveSat = dto.ClaveSat;
        if (!string.IsNullOrWhiteSpace(dto.TipoImpuesto)) entity.TipoImpuesto = dto.TipoImpuesto;
        if (dto.Activo.HasValue) entity.Activo = dto.Activo.Value;

        var setDefault = false;
        if (dto.EsDefault.HasValue)
        {
            entity.EsDefault = dto.EsDefault.Value;
            setDefault = dto.EsDefault.Value;
        }

        entity.ActualizadoEn = DateTime.UtcNow;
        entity.ActualizadoPor = _tenant.UserId;

        var ok = await _repo.ActualizarAsync(entity);
        if (ok && setDefault)
            await _repo.UnsetDefaultExceptAsync(_tenant.TenantId, id);

        return ok;
    }

    public Task<bool> EliminarAsync(int id) => _repo.EliminarAsync(id, _tenant.TenantId);

    private static void ValidarTasa(decimal tasa)
    {
        if (tasa < 0m || tasa > 1m)
            throw new InvalidOperationException(
                "La tasa debe ser un decimal entre 0.00 y 1.00 (ej. 0.16 para 16%).");
    }
}
