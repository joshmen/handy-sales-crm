using Npgsql;

namespace HandySuites.Billing.Api.Services;

public class CompanyLogoService : ICompanyLogoService
{
    private readonly string? _mainConnectionString;
    private readonly ILogger<CompanyLogoService> _logger;

    public CompanyLogoService(IConfiguration configuration, ILogger<CompanyLogoService> logger)
    {
        _mainConnectionString = configuration.GetConnectionString("MainConnection");
        _logger = logger;
    }

    public async Task<string?> GetLogoUrlAsync(string tenantId)
    {
        if (string.IsNullOrEmpty(_mainConnectionString))
        {
            _logger.LogWarning("MainConnection string not configured — cannot fetch company logo");
            return null;
        }

        try
        {
            await using var conn = new NpgsqlConnection(_mainConnectionString);
            await conn.OpenAsync();

            if (!int.TryParse(tenantId, out var tenantIdInt))
            {
                _logger.LogWarning("TenantId '{TenantId}' is not a valid integer", tenantId);
                return null;
            }

            await using var cmd = new NpgsqlCommand(
                """SELECT logo_url FROM company_settings WHERE tenant_id = @tenantId LIMIT 1""",
                conn);
            cmd.Parameters.AddWithValue("tenantId", tenantIdInt);

            var result = await cmd.ExecuteScalarAsync();
            var logoUrl = result as string;

            return string.IsNullOrEmpty(logoUrl) ? null : logoUrl;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not fetch company logo from main DB for tenant {TenantId}", tenantId);
            return null;
        }
    }
}
