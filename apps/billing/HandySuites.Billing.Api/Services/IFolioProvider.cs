namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Provider abstraction for the atomic folio reservation used when issuing CFDI
/// invoices. The default <see cref="NpgsqlFolioProvider"/> implementation uses a
/// PostgreSQL upsert (<c>INSERT ... ON CONFLICT DO UPDATE</c>) on
/// <c>numeracion_documentos</c> so concurrent emitters never collide.
///
/// Abstracting this lets controller tests run under the EF Core InMemory
/// provider (which does not support raw SQL / ON CONFLICT) by substituting a
/// deterministic stub. Production code is unchanged.
/// </summary>
public interface IFolioProvider
{
    /// <summary>
    /// Reserve and return the next sequential folio for the given tenant + serie.
    /// Implementations MUST be atomic across concurrent callers and MUST honor
    /// any ambient EF transaction so that, if the surrounding Factura save
    /// fails, the folio reservation rolls back together with it
    /// (BR-010 — no SAT-compliance folio gaps).
    /// </summary>
    Task<int> GetNextFolioAsync(string tenantId, string serie);
}
