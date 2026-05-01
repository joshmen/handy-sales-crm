using HandySuites.Application.Tracking.DTOs;
using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Application.Tracking.Services;

/// <summary>
/// Coordinador del tracking GPS de vendedores. Recibe batches de pings desde
/// mobile, valida feature flag del plan, deduplica y persiste. Para web admin
/// expone "última ubicación" y "recorrido del día".
/// </summary>
public class UbicacionVendedorService
{
    public const string FeatureCode = "tracking_vendedor";

    private readonly IUbicacionVendedorRepository _repo;
    private readonly ISubscriptionFeatureGuard _guard;
    private readonly ICurrentTenant _tenant;

    public UbicacionVendedorService(
        IUbicacionVendedorRepository repo,
        ISubscriptionFeatureGuard guard,
        ICurrentTenant tenant)
    {
        _repo = repo;
        _guard = guard;
        _tenant = tenant;
    }

    /// <summary>
    /// Persiste un batch de pings GPS del vendedor actual. Valida el plan
    /// antes de aceptar. Mismos `(UsuarioId, CapturadoEn)` se deduplican.
    /// </summary>
    public async Task<UbicacionBatchResultDto> GuardarBatchAsync(UbicacionBatchRequestDto request)
    {
        await _guard.RequireFeatureAsync(_tenant.TenantId, FeatureCode);

        if (request.Pings == null || request.Pings.Count == 0)
            return new UbicacionBatchResultDto { Aceptados = 0, Duplicados = 0 };

        var usuarioIdInt = int.TryParse(_tenant.UserId, out var uid) ? uid : 0;
        if (usuarioIdInt == 0)
            throw new InvalidOperationException("Usuario no identificado.");

        var ahora = DateTime.UtcNow;
        var entidades = request.Pings
            .Where(p => p.Latitud != 0 || p.Longitud != 0) // descarta pings inválidos
            .Select(p => new UbicacionVendedor
            {
                TenantId = _tenant.TenantId,
                UsuarioId = usuarioIdInt,
                Latitud = p.Latitud,
                Longitud = p.Longitud,
                PrecisionMetros = p.PrecisionMetros,
                Tipo = p.Tipo,
                CapturadoEn = p.CapturadoEn,
                ReferenciaId = p.ReferenciaId,
                DiaServicio = DateOnly.FromDateTime(p.CapturadoEn),
                Activo = true,
                CreadoEn = ahora,
                CreadoPor = _tenant.UserId,
            })
            .ToList();

        var (inserted, skipped) = await _repo.InsertBatchAsync(_tenant.TenantId, entidades);
        return new UbicacionBatchResultDto { Aceptados = inserted, Duplicados = skipped };
    }

    public Task<List<UltimaUbicacionDto>> ObtenerUltimasAsync(List<int>? usuarioIds = null)
        => _repo.ObtenerUltimasAsync(_tenant.TenantId, usuarioIds);

    public Task<List<UbicacionVendedorDto>> ObtenerRecorridoDelDiaAsync(int usuarioId, DateOnly dia)
        => _repo.ObtenerRecorridoDelDiaAsync(_tenant.TenantId, usuarioId, dia);
}
