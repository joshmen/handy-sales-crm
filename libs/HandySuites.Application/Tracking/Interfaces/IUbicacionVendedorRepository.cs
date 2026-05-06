using HandySuites.Application.Tracking.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Tracking.Interfaces;

public interface IUbicacionVendedorRepository
{
    /// <summary>
    /// Inserta un batch deduplicando por (UsuarioId, CapturadoEn) — si una
    /// fila con esa clave ya existe, se omite (idempotencia para retries).
    /// Devuelve (insertados, duplicados omitidos).
    /// </summary>
    Task<(int Inserted, int Skipped)> InsertBatchAsync(int tenantId, IEnumerable<UbicacionVendedor> pings);

    /// <summary>
    /// Última ubicación de cada vendedor con `usuarioIds` indicado. Usa
    /// DISTINCT ON (Postgres) para 1 query.
    /// </summary>
    Task<List<UltimaUbicacionDto>> ObtenerUltimasAsync(int tenantId, List<int>? usuarioIds = null);

    /// <summary>Recorrido entre <paramref name="inicioUtc"/> y <paramref name="finUtc"/>
    /// (todos los pings ordenados temporalmente). El caller es responsable de
    /// calcular el window en TZ tenant — usar <c>ITenantTimeZoneService.GetTenantDayWindowUtcAsync</c>.
    /// Filtra por <c>CapturadoEn</c> (UTC) en lugar de <c>DiaServicio</c> para
    /// evitar dependencia del campo, que históricamente se almacenó en UTC y
    /// puede no coincidir con el día calendario tenant.</summary>
    Task<List<UbicacionVendedorDto>> ObtenerRecorridoEntreAsync(
        int tenantId, int usuarioId, DateTime inicioUtc, DateTime finUtc);
}

public interface ISubscriptionFeatureGuard
{
    /// <summary>
    /// Verifica que el plan del tenant incluya el feature pedido. Si no, lanza
    /// FeatureNotInPlanException — el endpoint la convierte a 403 Forbidden
    /// con código machine-readable para que el mobile reaccione (deshabilita
    /// el timer, no spam de toasts).
    /// </summary>
    Task RequireFeatureAsync(int tenantId, string featureCode);

    /// <summary>Versión no-throwing para chequeos opcionales.</summary>
    Task<bool> HasFeatureAsync(int tenantId, string featureCode);
}

public class FeatureNotInPlanException : Exception
{
    public string FeatureCode { get; }
    public FeatureNotInPlanException(string featureCode)
        : base($"El feature '{featureCode}' no está incluido en el plan del tenant.")
    {
        FeatureCode = featureCode;
    }
}
