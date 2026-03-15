namespace HandySales.Application.SubscriptionPlans.Interfaces;

public interface ISubscriptionEnforcementService
{
    Task<EnforcementResult> CanCreateUsuarioAsync(int tenantId);
    Task<EnforcementResult> CanCreateProductoAsync(int tenantId);
    Task<EnforcementResult> CanCreateClienteAsync(int tenantId);
    Task<EnforcementResult> CanUsarTimbreAsync(int tenantId);
    Task<bool> RegistrarTimbreUsadoAsync(int tenantId);
    Task AddExtraTimbresAsync(int tenantId, int cantidad);
}

public record EnforcementResult(bool Allowed, string? Message = null, int? Current = null, int? Limit = null);
