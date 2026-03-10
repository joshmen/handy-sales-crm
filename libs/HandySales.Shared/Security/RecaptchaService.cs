using System.Net.Http.Json;
using Microsoft.Extensions.Logging;

namespace HandySales.Shared.Security;

public class RecaptchaService
{
    private readonly string? _secretKey;
    private readonly ILogger<RecaptchaService> _logger;
    private readonly HttpClient _httpClient;
    private const double MinScore = 0.5;

    public RecaptchaService(ILogger<RecaptchaService> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
        _secretKey = Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");

        if (string.IsNullOrEmpty(_secretKey))
            _logger.LogWarning("RECAPTCHA_SECRET_KEY not configured — reCAPTCHA validation will be skipped (dry-run)");
    }

    public async Task<bool> ValidateAsync(string? token, string action)
    {
        if (string.IsNullOrEmpty(_secretKey))
        {
            _logger.LogInformation("reCAPTCHA (dry run) action={Action} — skipping validation", action);
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("reCAPTCHA token missing for action={Action}", action);
            return false;
        }

        try
        {
            var response = await _httpClient.PostAsync(
                $"https://www.google.com/recaptcha/api/siteverify?secret={_secretKey}&response={token}",
                null);

            var result = await response.Content.ReadFromJsonAsync<RecaptchaResponse>();
            if (result == null)
            {
                _logger.LogError("reCAPTCHA returned null response");
                return false;
            }

            if (!result.Success)
            {
                _logger.LogWarning("reCAPTCHA validation failed: {Errors}", string.Join(", ", result.ErrorCodes ?? []));
                return false;
            }

            if (result.Score < MinScore)
            {
                _logger.LogWarning("reCAPTCHA score too low: {Score} for action={Action}", result.Score, action);
                return false;
            }

            _logger.LogInformation("reCAPTCHA passed: score={Score} action={Action}", result.Score, action);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "reCAPTCHA validation error for action={Action}", action);
            // Fail open in case of Google API issues — rate limiting still protects us
            return true;
        }
    }

    private class RecaptchaResponse
    {
        public bool Success { get; set; }
        public double Score { get; set; }
        public string? Action { get; set; }
        public string[]? ErrorCodes { get; set; }
    }
}
