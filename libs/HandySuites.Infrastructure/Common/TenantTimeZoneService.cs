using System.Collections.Concurrent;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.Common;

/// <inheritdoc />
public class TenantTimeZoneService : ITenantTimeZoneService
{
    /// <summary>Cache estático: el TZ del tenant cambia muy raramente
    /// (admin lo configura 1 vez en setup). 1 lookup por tenant por proceso
    /// es aceptable. Si el admin cambia el TZ, la app se reinicia (Railway
    /// redeploy) y la cache se limpia. Para un cambio en caliente sin
    /// redeploy, agregar un flush via SignalR si se necesita.</summary>
    private static readonly ConcurrentDictionary<int, string> _tzCache = new();

    private static readonly TimeZoneInfo _fallback;

    static TenantTimeZoneService()
    {
        try { _fallback = TimeZoneInfo.FindSystemTimeZoneById("America/Mexico_City"); }
        catch { _fallback = TimeZoneInfo.Utc; }
    }

    private readonly HandySuitesDbContext _db;
    private readonly ICurrentTenant _currentTenant;

    public TenantTimeZoneService(HandySuitesDbContext db, ICurrentTenant currentTenant)
    {
        _db = db;
        _currentTenant = currentTenant;
    }

    public async Task<TimeZoneInfo> GetTenantTimeZoneAsync(CancellationToken ct = default)
        => await GetTimeZoneForTenantAsync(_currentTenant.TenantId, ct);

    public async Task<TimeZoneInfo> GetTimeZoneForTenantAsync(int tenantId, CancellationToken ct = default)
    {
        if (tenantId <= 0) return _fallback;
        if (!_tzCache.TryGetValue(tenantId, out var tzId))
        {
            tzId = await _db.CompanySettings.AsNoTracking()
                .IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId)
                .Select(c => c.Timezone)
                .FirstOrDefaultAsync(ct) ?? "America/Mexico_City";
            _tzCache[tenantId] = tzId;
        }
        try { return TimeZoneInfo.FindSystemTimeZoneById(tzId); }
        catch { return _fallback; }
    }

    public async Task<DateOnly> GetTenantTodayAsync(CancellationToken ct = default)
    {
        var tz = await GetTenantTimeZoneAsync(ct);
        var nowInTz = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        return DateOnly.FromDateTime(nowInTz);
    }

    public async Task<(DateTime InicioUtc, DateTime FinUtc)> GetTenantDayWindowUtcAsync(
        DateOnly? dia = null, CancellationToken ct = default)
    {
        var tz = await GetTenantTimeZoneAsync(ct);
        var fechaTenant = dia ?? DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz));
        var inicioLocalUnspec = DateTime.SpecifyKind(fechaTenant.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var inicioUtc = TimeZoneInfo.ConvertTimeToUtc(inicioLocalUnspec, tz);
        var finUtc = inicioUtc.AddDays(1);
        return (inicioUtc, finUtc);
    }

    public (DateTime InicioUtc, DateTime FinUtc) GetCalendarDayWindowUtc(DateOnly dia)
    {
        // MEDIANOCHE UTC del día calendario (sin shift de TZ). Los campos
        // date-only se guardan a 00:00 UTC (.Date) o 12:00 UTC (dateOnlyToUTC);
        // ambos caen en [00:00, +1 día). La window tz-shifted los excluiría.
        var inicioUtc = new DateTime(dia.Year, dia.Month, dia.Day, 0, 0, 0, DateTimeKind.Utc);
        return (inicioUtc, inicioUtc.AddDays(1));
    }

    public async Task<DateTime> GetTenantTodayMidnightUtcAsync(CancellationToken ct = default)
    {
        var hoy = await GetTenantTodayAsync(ct);
        return GetCalendarDayWindowUtc(hoy).InicioUtc;
    }

    public async Task<DateTime> ConvertTenantDateToUtcAsync(DateOnly tenantDate, CancellationToken ct = default)
    {
        var tz = await GetTenantTimeZoneAsync(ct);
        var localUnspec = DateTime.SpecifyKind(tenantDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(localUnspec, tz);
    }

    public async Task<DateOnly> GetTenantDayFromUtcAsync(DateTime utcInstant, CancellationToken ct = default)
    {
        var tz = await GetTenantTimeZoneAsync(ct);
        // Defensive: si el instante viene sin Kind, asumir UTC.
        var utc = utcInstant.Kind == DateTimeKind.Utc
            ? utcInstant
            : DateTime.SpecifyKind(utcInstant, DateTimeKind.Utc);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(utc, tz));
    }
}
