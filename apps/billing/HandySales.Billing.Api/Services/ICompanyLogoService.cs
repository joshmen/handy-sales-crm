namespace HandySales.Billing.Api.Services;

public interface ICompanyLogoService
{
    Task<string?> GetLogoUrlAsync(string tenantId);
}
