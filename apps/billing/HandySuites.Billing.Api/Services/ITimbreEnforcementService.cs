namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Checks timbre (CFDI stamp) availability with the Main API subscription system.
/// </summary>
public interface ITimbreEnforcementService
{
    /// <summary>
    /// Checks if the tenant has available timbres in their subscription plan.
    /// Returns (allowed, message, usados, maximo).
    /// </summary>
    Task<TimbreCheckResult> CheckTimbreAvailableAsync(string authorizationHeader);

    /// <summary>
    /// Notifies the Main API that a timbre was used (increments counter).
    /// </summary>
    Task NotifyTimbreUsedAsync(string authorizationHeader);
}

public record TimbreCheckResult(bool Allowed, string? Message, int Usados, int Maximo);
