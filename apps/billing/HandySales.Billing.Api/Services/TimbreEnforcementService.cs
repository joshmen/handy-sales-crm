using System.Net.Http.Headers;
using System.Text.Json;

namespace HandySales.Billing.Api.Services;

/// <summary>
/// Calls Main API /api/subscription/timbres to check stamp availability.
/// Forwards the user's JWT token for tenant identification.
/// </summary>
public class TimbreEnforcementService : ITimbreEnforcementService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TimbreEnforcementService> _logger;

    public TimbreEnforcementService(HttpClient httpClient, ILogger<TimbreEnforcementService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<TimbreCheckResult> CheckTimbreAvailableAsync(string authorizationHeader)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "/api/subscription/timbres");
            request.Headers.Authorization = AuthenticationHeaderValue.Parse(authorizationHeader);

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Main API timbres check returned {Status}", response.StatusCode);
                // If Main API is down or returns error, allow stamping (fail-open for availability)
                return new TimbreCheckResult(true, null, 0, 0);
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            return new TimbreCheckResult(
                Allowed: root.GetProperty("allowed").GetBoolean(),
                Message: root.TryGetProperty("message", out var msg) ? msg.GetString() : null,
                Usados: root.GetProperty("usados").GetInt32(),
                Maximo: root.GetProperty("maximo").GetInt32()
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking timbre availability with Main API");
            // Fail-open: if we can't reach Main API, allow stamping
            return new TimbreCheckResult(true, null, 0, 0);
        }
    }

    public async Task NotifyTimbreUsedAsync(string authorizationHeader)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/subscription/timbres/registrar");
            request.Headers.Authorization = AuthenticationHeaderValue.Parse(authorizationHeader);

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Failed to register timbre usage: {Status}", response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying timbre usage to Main API");
        }
    }
}
