using HandySuites.Application.Common.Interfaces;
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

    // VULN-M04 fix: bounds y velocidad sobre `CapturadoEn` del cliente.
    // El device manda el timestamp para preservar orden offline, pero sin
    // bounds un atacante (vendedor) puede forjar visitas en el pasado/futuro.
    //
    // FUTURE_TOLERANCE: clock skew razonable + buffer de network latency.
    //   Un device adelantado 60s no es sospechoso.
    // PAST_TOLERANCE: 6h cubre el caso real de "salí 6h sin red, sincronizo
    //   al volver". Más que eso es legítimamente sospechoso (¿por qué 24h sin
    //   sync? batch debería disparar antes).
    // MAX_VELOCITY_KMH: 1000 km/h cubre vehículo + avión comercial. Más allá
    //   es teleport — flaggeable como spoof.
    private static readonly TimeSpan FutureTolerance = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan PastTolerance = TimeSpan.FromHours(6);
    private const double MaxVelocityKmh = 1000.0;
    private const double EarthRadiusKm = 6371.0;

    private readonly IUbicacionVendedorRepository _repo;
    private readonly ISubscriptionFeatureGuard _guard;
    private readonly ICurrentTenant _tenant;
    private readonly ITenantTimeZoneService _tenantTz;

    public UbicacionVendedorService(
        IUbicacionVendedorRepository repo,
        ISubscriptionFeatureGuard guard,
        ICurrentTenant tenant,
        ITenantTimeZoneService tenantTz)
    {
        _repo = repo;
        _guard = guard;
        _tenant = tenant;
        _tenantTz = tenantTz;
    }

    /// <summary>
    /// Persiste un batch de pings GPS del vendedor actual. Valida el plan
    /// antes de aceptar. Mismos `(UsuarioId, CapturadoEn)` se deduplican.
    /// Pings con timestamp fuera de ventana razonable o velocidad implausible
    /// vs el último ping aceptado se descartan silenciosamente (cuentan como
    /// "Duplicados" para no exponer la lógica de detección al cliente).
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
        var futureLimit = ahora + FutureTolerance;
        var pastLimit = ahora - PastTolerance;

        // Filtro 1: bounds básicos (lat/lng válidos + timestamp en ventana).
        var validPings = request.Pings
            .Where(p =>
                (p.Latitud != 0 || p.Longitud != 0) &&
                p.Latitud >= -90 && p.Latitud <= 90 &&
                p.Longitud >= -180 && p.Longitud <= 180 &&
                p.CapturadoEn <= futureLimit &&
                p.CapturadoEn >= pastLimit)
            .OrderBy(p => p.CapturadoEn)
            .ToList();

        if (validPings.Count == 0)
            return new UbicacionBatchResultDto { Aceptados = 0, Duplicados = request.Pings.Count };

        // Filtro 2: velocidad implausible vs último ping aceptado del mismo
        // usuario. Cargamos el último ping persistido para que el primer ping
        // del batch tenga referencia (sino un atacante manda batch con un
        // único ping forjado y nunca compara).
        var lastKnown = await _repo.ObtenerUltimasAsync(_tenant.TenantId, new List<int> { usuarioIdInt });
        UbicacionPingDto? prev = null;
        if (lastKnown != null && lastKnown.Count > 0)
        {
            var l = lastKnown[0];
            prev = new UbicacionPingDto
            {
                Latitud = l.Latitud,
                Longitud = l.Longitud,
                CapturadoEn = l.CapturadoEn,
            };
        }

        var accepted = new List<UbicacionPingDto>();
        var velocityRejected = 0;
        foreach (var p in validPings)
        {
            if (prev != null && IsImplausibleVelocity(prev, p))
            {
                velocityRejected++;
                continue;
            }
            accepted.Add(p);
            prev = p;
        }

        if (accepted.Count == 0)
            return new UbicacionBatchResultDto { Aceptados = 0, Duplicados = request.Pings.Count };

        // DiaServicio se calcula en TZ del tenant (no UTC) para que las queries
        // por "día calendario tenant" funcionen correctamente. Reportado
        // 2026-05-06: ping de 17:19 Mazatlán (=00:19 UTC del día siguiente)
        // se almacenaba con DiaServicio = día UTC (incorrecto).
        var tenantTzInfo = await _tenantTz.GetTenantTimeZoneAsync();
        DateOnly DiaServicioParaUtc(DateTime utc) =>
            DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
                utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc),
                tenantTzInfo));

        var entidades = accepted
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
                DiaServicio = DiaServicioParaUtc(p.CapturadoEn),
                Activo = true,
                CreadoEn = ahora,
                CreadoPor = _tenant.UserId,
            })
            .ToList();

        var (inserted, skipped) = await _repo.InsertBatchAsync(_tenant.TenantId, entidades);
        var totalRejected = (request.Pings.Count - validPings.Count) + velocityRejected + skipped;
        return new UbicacionBatchResultDto { Aceptados = inserted, Duplicados = totalRejected };
    }

    private static bool IsImplausibleVelocity(UbicacionPingDto a, UbicacionPingDto b)
    {
        var deltaSeconds = Math.Abs((b.CapturadoEn - a.CapturadoEn).TotalSeconds);
        if (deltaSeconds < 1) return false; // mismo segundo o menos — no podemos calcular velocidad confiablemente
        var distKm = HaversineKm(a.Latitud, a.Longitud, b.Latitud, b.Longitud);
        var velocityKmh = distKm / (deltaSeconds / 3600.0);
        return velocityKmh > MaxVelocityKmh;
    }

    private static double HaversineKm(decimal lat1d, decimal lon1d, decimal lat2d, decimal lon2d)
    {
        var lat1 = ToRadians((double)lat1d);
        var lat2 = ToRadians((double)lat2d);
        var dLat = ToRadians((double)(lat2d - lat1d));
        var dLon = ToRadians((double)(lon2d - lon1d));
        var h = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1) * Math.Cos(lat2) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(h), Math.Sqrt(1 - h));
        return EarthRadiusKm * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

    public Task<List<UltimaUbicacionDto>> ObtenerUltimasAsync(List<int>? usuarioIds = null)
        => _repo.ObtenerUltimasAsync(_tenant.TenantId, usuarioIds);

    public Task<List<UbicacionVendedorDto>> ObtenerRecorridoEntreAsync(
        int usuarioId, DateTime inicioUtc, DateTime finUtc)
        => _repo.ObtenerRecorridoEntreAsync(_tenant.TenantId, usuarioId, inicioUtc, finUtc);
}
