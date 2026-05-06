using HandySuites.Domain.Entities;

namespace HandySuites.Application.Common.Interfaces;

/// <summary>
/// Helper para alinear cálculos de fecha (hoy, esta semana, etc.) con la
/// zona horaria configurada por el tenant en <c>CompanySetting.Timezone</c>
/// (ej. <c>America/Mazatlan</c>, <c>America/Mexico_City</c>).
///
/// Reportado 2026-05-06: vendedor en Mazatlán (UTC-7) veía pings del 5 mayo
/// 17:19 (=00:19 UTC del 6) como si fueran de "hoy" porque el server filtraba
/// con <c>DateTime.UtcNow.Date</c> sin convertir a TZ tenant.
///
/// Uso típico (filtro "hoy" para una query):
/// <code>
/// var (inicioUtc, finUtc) = await _tenantTz.GetTenantDayWindowUtcAsync();
/// var ventas = await db.Pedidos
///     .Where(p => p.TenantId == tenantId &amp;&amp;
///                 p.CreadoEn &gt;= inicioUtc &amp;&amp; p.CreadoEn &lt; finUtc)
///     .ToListAsync();
/// </code>
/// </summary>
public interface ITenantTimeZoneService
{
    /// <summary>Resuelve el TZ del tenant actual (cache scoped). Default
    /// <c>America/Mexico_City</c> si no está configurado o el id no es válido.</summary>
    Task<TimeZoneInfo> GetTenantTimeZoneAsync(CancellationToken ct = default);

    /// <summary>Resuelve el TZ de un tenant específico (útil para code que no
    /// está scoped al tenant del request, e.g. background jobs por tenant).</summary>
    Task<TimeZoneInfo> GetTimeZoneForTenantAsync(int tenantId, CancellationToken ct = default);

    /// <summary>Fecha "hoy" en TZ del tenant actual. Para Mazatlán a las
    /// 00:43 hora local del 6 mayo (= 7:43 UTC), retorna <c>2026-05-06</c>
    /// — NO el día UTC.</summary>
    Task<DateOnly> GetTenantTodayAsync(CancellationToken ct = default);

    /// <summary>Convierte una fecha tenant a window UTC <c>[inicio, fin)</c>
    /// para usar en filtros EF. Si <paramref name="dia"/> es null, usa "hoy"
    /// del tenant.</summary>
    Task<(DateTime InicioUtc, DateTime FinUtc)> GetTenantDayWindowUtcAsync(
        DateOnly? dia = null, CancellationToken ct = default);

    /// <summary>Convierte una fecha calendario tenant a un instante UTC que
    /// representa <c>00:00:00</c> en TZ tenant. Útil para `CapturadoEn >= X`.</summary>
    Task<DateTime> ConvertTenantDateToUtcAsync(DateOnly tenantDate, CancellationToken ct = default);

    /// <summary>Convierte un instante UTC al `DateOnly` del día calendario
    /// en TZ tenant. Útil para almacenar `DiaServicio`.</summary>
    Task<DateOnly> GetTenantDayFromUtcAsync(DateTime utcInstant, CancellationToken ct = default);
}
