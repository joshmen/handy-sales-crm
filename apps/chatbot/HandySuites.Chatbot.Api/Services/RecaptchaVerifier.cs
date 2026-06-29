using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace HandySuites.Chatbot.Api.Services;

/// <summary>
/// Verifica tokens de reCAPTCHA v3 (anti-bot) contra Google. Si RECAPTCHA_SECRET_KEY no esta
/// configurado (dev), permite el paso (fail-open) para no bloquear el flujo local; en prod,
/// con el secreto presente, exige success + score >= umbral + accion esperada.
/// </summary>
public class RecaptchaVerifier
{
    private const string VerifyUrl = "https://www.google.com/recaptcha/api/siteverify";

    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _cfg;
    private readonly IHostEnvironment _env;
    private readonly ILogger<RecaptchaVerifier> _log;

    public RecaptchaVerifier(IHttpClientFactory http, IConfiguration cfg, IHostEnvironment env, ILogger<RecaptchaVerifier> log)
    {
        _http = http;
        _cfg = cfg;
        _env = env;
        _log = log;
    }

    public async Task<bool> VerifyAsync(string? token, string expectedAction, CancellationToken ct = default)
    {
        if (_env.IsDevelopment()) return true; // dev: no se exige captcha (el widget aun no lo envia)
        // Enforcement OPT-IN: hasta que el widget genere tokens reCAPTCHA, activar con
        // RECAPTCHA_ENABLED=true; de lo contrario no se exige (evita romper handoff/lead en prod).
        var enabled = string.Equals(
            _cfg["RECAPTCHA_ENABLED"] ?? Environment.GetEnvironmentVariable("RECAPTCHA_ENABLED"),
            "true", StringComparison.OrdinalIgnoreCase);
        if (!enabled) return true;
        var secret = _cfg["RECAPTCHA_SECRET_KEY"] ?? Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(secret)) return true; // habilitado pero sin secreto => permitir (no romper)
        if (string.IsNullOrWhiteSpace(token)) return false;

        try
        {
            var client = _http.CreateClient();
            var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = secret,
                ["response"] = token,
            });
            using var resp = await client.PostAsync(VerifyUrl, form, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _log.LogWarning("reCAPTCHA verify devolvio {Code}", resp.StatusCode);
                return false;
            }

            var r = await resp.Content.ReadFromJsonAsync<RecaptchaResponse>(cancellationToken: ct);
            if (r is null || !r.Success) return false;

            var minScore = double.TryParse(_cfg["RECAPTCHA_MIN_SCORE"], out var ms) ? ms : 0.5;
            if (r.Score < minScore)
            {
                _log.LogInformation("reCAPTCHA score {Score} < {Min}", r.Score, minScore);
                return false;
            }
            if (!string.IsNullOrEmpty(r.Action) &&
                !string.Equals(r.Action, expectedAction, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
            return true;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Error verificando reCAPTCHA");
            return false;
        }
    }

    private class RecaptchaResponse
    {
        public bool Success { get; set; }
        public double Score { get; set; }
        public string? Action { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }
    }
}
