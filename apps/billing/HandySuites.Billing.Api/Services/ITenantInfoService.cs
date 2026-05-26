namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Cross-API client para info de tenant desde Main API.
/// BILL-1 (2026-05-26): usado para resolver emails de admins al notificar
/// resultado de alta Finkok.
/// </summary>
public interface ITenantInfoService
{
    /// <summary>
    /// Devuelve los emails de TODOS los usuarios con rol ADMIN o SUPER_ADMIN del tenant.
    /// Best-effort: si falla la llamada cross-API, devuelve lista vacía.
    /// </summary>
    Task<IReadOnlyList<string>> GetAdminEmailsAsync(int tenantId, CancellationToken ct = default);
}
