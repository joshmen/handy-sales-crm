using System.Net.Http.Headers;
using System.Text.Json;

namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Calls Main API /api/subscription/timbres to check stamp availability.
/// Forwards the user's JWT token for tenant identification.
///
/// BR-011: fail-closed. If Main API is unreachable or returns error, we DO NOT
/// allow stamping. Previous behavior (Audit CRITICAL-4, Abril 2026) was fail-open,
/// which meant a Main API outage let tenants stamp unlimited CFDIs without quota
/// decrement — creating an unauditable SAT quota overage.
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
                _logger.LogError(
                    "Main API timbres check returned {Status}. Fail-closed: blocking stamp.",
                    response.StatusCode);
                return new TimbreCheckResult(
                    Allowed: false,
                    Message: "No se puede verificar disponibilidad de timbres. Intenta de nuevo en unos momentos.",
                    Usados: 0,
                    Maximo: 0);
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
            _logger.LogError(ex, "Error checking timbre availability with Main API. Fail-closed: blocking stamp.");
            return new TimbreCheckResult(
                Allowed: false,
                Message: "No se puede verificar disponibilidad de timbres. Intenta de nuevo en unos momentos.",
                Usados: 0,
                Maximo: 0);
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
                _logger.LogError(
                    "Failed to register timbre usage: {Status}. Tenant may have stamped without decrementing quota \u2014 manual reconciliation required.",
                    response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error notifying timbre usage to Main API. Tenant may have stamped without decrementing quota \u2014 manual reconciliation required.");
        }
    }
}
