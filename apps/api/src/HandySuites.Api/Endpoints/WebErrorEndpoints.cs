using System.Text.RegularExpressions;

namespace HandySuites.Api.Endpoints;

public static class WebErrorEndpoints
{
    // Anonymous endpoint para crash reports del frontend web. Sanitiza para evitar
    // log injection y log bloat:
    // - Trunca campos para evitar disk fill via spam de payloads enormes
    // - Sanitiza URLs eliminando query params sensibles (token=, password=, etc.)
    // - Quita caracteres de control que rompen el formato de Serilog
    private const int MaxMessageLength = 500;
    private const int MaxStackLength = 2000;
    private const int MaxUserAgentLength = 256;
    private const int MaxUrlLength = 1024;

    private static readonly Regex SensitiveQueryParam = new(
        @"([?&])(token|password|secret|key|apikey|api_key|auth|jwt|session|sid)=[^&#]*",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ControlChars = new(@"[\x00-\x08\x0B\x0C\x0E-\x1F]", RegexOptions.Compiled);

    public static void MapWebErrorEndpoints(this IEndpointRouteBuilder app)
    {
        // Body cap 16 KB (suficiente para stack truncado) — defensa de profundidad
        // contra DoS via payloads enormes; los Sanitize() truncan otra vez por si
        // el body ya es chico pero los campos son grandes.
        const int MaxBodyBytes = 16 * 1024;

        app.MapPost("/api/web-errors", async (HttpContext ctx, ILogger<WebErrorDto> logger) =>
        {
            ctx.Request.EnableBuffering();
            if (ctx.Request.ContentLength is long len && len > MaxBodyBytes)
                return Results.BadRequest(new { error = "Payload too large" });

            WebErrorDto? dto;
            try
            {
                dto = await ctx.Request.ReadFromJsonAsync<WebErrorDto>();
            }
            catch
            {
                return Results.BadRequest(new { error = "Invalid JSON" });
            }
            if (dto is null) return Results.BadRequest(new { error = "Empty body" });

            var message = Sanitize(dto.Message, MaxMessageLength);
            var stack = Sanitize(dto.Stack, MaxStackLength);
            var userAgent = Sanitize(dto.UserAgent, MaxUserAgentLength);
            var url = SanitizeUrl(dto.Url, MaxUrlLength);

            logger.LogError(
                "WEB_ERROR at {Url}: {Message} | UA: {UserAgent} | Stack: {Stack}",
                url, message, userAgent, stack);

            return Results.Ok(new { received = true });
        })
        .AllowAnonymous()
        .RequireRateLimiting("anonymous")
        .WithTags("Monitoring");
    }

    private static string Sanitize(string? value, int maxLength)
    {
        if (string.IsNullOrEmpty(value)) return "";
        var stripped = ControlChars.Replace(value, "");
        return stripped.Length > maxLength ? stripped[..maxLength] + "...(truncated)" : stripped;
    }

    private static string SanitizeUrl(string? value, int maxLength)
    {
        if (string.IsNullOrEmpty(value)) return "";
        var redacted = SensitiveQueryParam.Replace(value, "$1$2=[REDACTED]");
        return Sanitize(redacted, maxLength);
    }
}

public record WebErrorDto(string Message, string? Stack, string? Url, string? UserAgent, string? Timestamp);
