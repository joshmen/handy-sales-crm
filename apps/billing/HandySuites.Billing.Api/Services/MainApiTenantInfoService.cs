using System.Text.Json;
using System.Text.Json.Serialization;

namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Implementación que consulta Main API endpoint /api/internal/tenants/{id}/admin-emails.
/// Auth via X-Internal-Api-Key header (mismo patrón que cross-API sync existente).
/// </summary>
public class MainApiTenantInfoService : ITenantInfoService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MainApiTenantInfoService> _logger;
    private readonly string _apiKey;

    public MainApiTenantInfoService(HttpClient httpClient, IConfiguration config, ILogger<MainApiTenantInfoService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = config["InternalApiKey"]
            ?? throw new InvalidOperationException("InternalApiKey no configurado en Billing API");

        // Main API URL desde configuration. En docker-compose el service name es "api_main".
        var baseUrl = config["MainApiBaseUrl"] ?? "http://api_main:1050";
        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.DefaultRequestHeaders.Add("X-Internal-Api-Key", _apiKey);
    }

    public async Task<IReadOnlyList<string>> GetAdminEmailsAsync(int tenantId, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/internal/tenants/{tenantId}/admin-emails", ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("GetAdminEmails: Main API respondió {Status} para tenant {Tenant}",
                    response.StatusCode, tenantId);
                return Array.Empty<string>();
            }

            var payload = await response.Content.ReadFromJsonAsync<AdminEmailsResponse>(cancellationToken: ct);
            return (IReadOnlyList<string>?)payload?.Emails ?? Array.Empty<string>();
        }
        catch (Exception ex)
        {
            // Best-effort: si la cross-API call falla, log y seguir.
            // No queremos que un email fallido bloquee el flujo de alta Finkok.
            _logger.LogError(ex, "GetAdminEmails: error consultando Main API para tenant {Tenant}", tenantId);
            return Array.Empty<string>();
        }
    }

    private class AdminEmailsResponse
    {
        [JsonPropertyName("tenantId")] public int TenantId { get; set; }
        [JsonPropertyName("emails")] public List<string> Emails { get; set; } = new();
    }
}
