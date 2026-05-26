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
    private readonly string? _apiKey;
    private readonly string? _baseUrl;

    public MainApiTenantInfoService(HttpClient httpClient, IConfiguration config, ILogger<MainApiTenantInfoService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        // Resiliente: si faltan env vars NO tiramos en el constructor (rompería el DI del
        // CatalogosController entero, afectando endpoints sin relación con emails).
        // Email es best-effort: si no se puede resolver admin emails, los logs lo reportan
        // y el flujo principal de alta Finkok sigue.
        _apiKey = config["INTERNAL_API_KEY"] ?? config["InternalApiKey"];
        _baseUrl = config["MainApiBaseUrl"] ?? config["MAIN_API_URL"];

        if (!string.IsNullOrEmpty(_baseUrl))
        {
            _httpClient.BaseAddress = new Uri(_baseUrl);
        }
        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Internal-Api-Key", _apiKey);
        }
    }

    public async Task<IReadOnlyList<string>> GetAdminEmailsAsync(int tenantId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_baseUrl))
        {
            _logger.LogWarning(
                "GetAdminEmails: faltan env vars (INTERNAL_API_KEY o MainApiBaseUrl/MAIN_API_URL) en Billing API. " +
                "Notificación email a admins del tenant {Tenant} se omite.", tenantId);
            return Array.Empty<string>();
        }

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
