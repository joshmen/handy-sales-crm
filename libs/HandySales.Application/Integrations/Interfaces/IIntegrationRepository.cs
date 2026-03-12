using HandySales.Domain.Entities;

namespace HandySales.Application.Integrations.Interfaces;

public interface IIntegrationRepository
{
    Task<List<Integration>> GetAllCatalogAsync();
    Task<Integration?> GetBySlugAsync(string slug);
    Task<List<TenantIntegration>> GetTenantIntegrationsAsync(int tenantId);
    Task<TenantIntegration?> GetTenantIntegrationAsync(int tenantId, int integrationId);
    Task<TenantIntegration> ActivateAsync(int tenantId, int integrationId, int userId, string? configuracion);
    Task DeactivateAsync(TenantIntegration tenantIntegration, int userId);
    Task LogActionAsync(int tenantId, int integrationId, int userId, string accion, string? descripcion);
}
