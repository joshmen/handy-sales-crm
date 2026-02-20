namespace HandySales.Application.Tenants.Interfaces;

public interface ITenantSeedService
{
    Task SeedDemoDataAsync(int tenantId);
}
