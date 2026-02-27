namespace HandySales.Application.SubscriptionPlans.Interfaces;

public interface ISubscriptionEnforcementService
{
    Task<EnforcementResult> CanCreateUsuarioAsync(int tenantId);
    Task<EnforcementResult> CanCreateProductoAsync(int tenantId);
    Task<EnforcementResult> CanCreateClienteAsync(int tenantId);
}

public record EnforcementResult(bool Allowed, string? Message = null, int? Current = null, int? Limit = null);
