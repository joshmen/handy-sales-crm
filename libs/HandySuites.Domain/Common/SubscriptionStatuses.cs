namespace HandySuites.Domain.Common;

/// <summary>
/// Estados de suscripción de <c>Tenant.SubscriptionStatus</c>. Convención canónica
/// PascalCase ("Trial", "Active", "PastDue", "Expired", "Cancelled"). Los writers
/// deben usar estas constantes.
///
/// Las comparaciones de estado DEBEN hacerse con estos helpers (case-insensitive)
/// para tolerar casing inconsistente en los datos — p.ej. un "active" en minúscula
/// dejado por SQL manual o un edge de un webhook de Stripe. Bug histórico: el guard
/// <c>is not ("Trial" or "Active")</c> es case-sensitive y devolvía 402 ("suscripción
/// expirada") a tenants con "active" en minúscula, aunque estaban activos.
/// </summary>
public static class SubscriptionStatuses
{
    public const string Trial = "Trial";
    public const string Active = "Active";
    public const string Expired = "Expired";
    public const string PastDue = "PastDue";
    public const string Cancelled = "Cancelled";

    /// <summary>Igualdad case-insensitive contra un estado canónico.</summary>
    public static bool Eq(string? status, string expected) =>
        status is not null && status.Equals(expected, System.StringComparison.OrdinalIgnoreCase);

    public static bool IsTrial(string? status) => Eq(status, Trial);
    public static bool IsActive(string? status) => Eq(status, Active);
    public static bool IsExpired(string? status) => Eq(status, Expired);
    public static bool IsPastDue(string? status) => Eq(status, PastDue);

    /// <summary>Suscripción que permite operar (Trial o Active).</summary>
    public static bool IsActiveOrTrial(string? status) => IsActive(status) || IsTrial(status);
}
