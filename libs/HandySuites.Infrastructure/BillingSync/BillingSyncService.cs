using System.Net.Http.Json;
using HandySuites.Application.BillingSync;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HandySuites.Infrastructure.BillingSync;

public class BillingSyncService : IBillingSyncService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<BillingSyncService> _logger;

    public BillingSyncService(HttpClient http, IConfiguration config, ILogger<BillingSyncService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task SyncDatosEmpresaAsync(SyncDatosEmpresaDto dto, string userJwt, CancellationToken ct = default)
    {
        var billingUrlRaw = _config["BILLING_API_URL"];
        var apiKey = _config["BILLING_INTERNAL_API_KEY"];

        if (string.IsNullOrWhiteSpace(billingUrlRaw) || string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogDebug("BillingSync no configurado (BILLING_API_URL o BILLING_INTERNAL_API_KEY vacíos) — skip");
            return;
        }

        // Trim whitespace (incluyendo CR/LF que Railway/editores a veces añaden)
        var billingUrl = billingUrlRaw.Trim();

        // Validar formato del URI antes de construirlo (evita UriFormatException opaco)
        if (!Uri.TryCreate(billingUrl, UriKind.Absolute, out var baseUri)
            || (baseUri.Scheme != Uri.UriSchemeHttp && baseUri.Scheme != Uri.UriSchemeHttps))
        {
            _logger.LogError(
                "BillingSync: BILLING_API_URL no es un URI válido. Valor recibido='{Value}' (len={Len}). Esperado: https://host.example.com",
                billingUrl, billingUrl.Length);
            return;
        }

        if (string.IsNullOrWhiteSpace(userJwt))
        {
            _logger.LogWarning("BillingSync: userJwt vacío, no se puede llamar Billing API sin JWT");
            return;
        }

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post,
                new Uri(baseUri, "/api/internal/sync/datos-empresa"));
            req.Headers.Add("X-Internal-Api-Key", apiKey);
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userJwt);
            req.Content = JsonContent.Create(dto);

            using var res = await _http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                var body = await res.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("BillingSync falló ({Status}) para tenant {TenantId}: {Body}",
                    res.StatusCode, dto.TenantId, body);
                return;
            }

            _logger.LogInformation("BillingSync OK para tenant {TenantId}", dto.TenantId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "BillingSync excepción para tenant {TenantId} (non-fatal)", dto.TenantId);
        }
    }
}
