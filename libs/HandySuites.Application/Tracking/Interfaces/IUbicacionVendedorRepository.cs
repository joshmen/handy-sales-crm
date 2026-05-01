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

    /// <summary>Recorrido del día completo (todos los pings ordenados temporalmente).</summary>
    Task<List<UbicacionVendedorDto>> ObtenerRecorridoDelDiaAsync(int tenantId, int usuarioId, DateOnly dia);
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
