namespace HandySuites.Application.SubscriptionPlans.Interfaces;

public interface ISubscriptionEnforcementService
{
    Task<EnforcementResult> CanCreateUsuarioAsync(int tenantId);
    Task<EnforcementResult> CanCreateProductoAsync(int tenantId);
    Task<EnforcementResult> CanCreateClienteAsync(int tenantId);
    Task<EnforcementResult> CanUsarTimbreAsync(int tenantId);
    Task<bool> RegistrarTimbreUsadoAsync(int tenantId);
    Task AddExtraTimbresAsync(int tenantId, int cantidad);
    Task<EnforcementResult> CanGenerarFacturaAsync(int tenantId);
    Task<bool> RegistrarFacturaGeneradaAsync(int tenantId);
}

public record EnforcementResult(bool Allowed, string? Message = null, int? Current = null, int? Limit = null);
