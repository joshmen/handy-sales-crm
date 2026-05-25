using System.Text.RegularExpressions;

namespace HandySuites.Api.Configuration;

/// <summary>
/// Audit H-3 (2026-05-25): RequestLoggingMiddleware solía loguear el QueryString raw,
/// permitiendo que tokens/emails/passwords llegaran a Seq + CloudWatch.
///
/// Esta clase enmascara valores asociados a keys sensitivas. Patrón canónico de OWASP A09.
/// Se mantiene separada del middleware para que sea fácilmente testeable.
/// </summary>
public static class QueryStringRedactor
{
    private static readonly Regex SensitiveQueryRegex = new(
        @"(?i)\b(token|code|email|password|pass|apikey|api_key|secret|access_token|refresh_token|otp|totp|recovery)=([^&\s]+)",
        RegexOptions.Compiled);

    /// <summary>
    /// Devuelve el query string con los valores sensitivos sustituidos por ***REDACTED***.
    /// Preserva el resto del string sin modificar (orden, separadores, otras keys).
    /// </summary>
    public static string Redact(string? queryString)
    {
        if (string.IsNullOrEmpty(queryString)) return queryString ?? string.Empty;
        return SensitiveQueryRegex.Replace(queryString, m => $"{m.Groups[1].Value}=***REDACTED***");
    }
}
