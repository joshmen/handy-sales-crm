namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Registro de países donde Handy Suites tiene integración fiscal implementada.
/// Espejado intencionalmente desde libs/HandySuites.Shared/Billing/BillingCountrySupport.cs
/// para mantener la Billing API como microservicio standalone (sin project ref cross).
/// Si agregas un país acá, agrégalo TAMBIÉN en el archivo de Shared para que mobile
/// y backend mobile API estén alineados con el mismo registro.
/// </summary>
public static class BillingCountrySupport
{
    private static readonly HashSet<string> SupportedCountries = new(StringComparer.OrdinalIgnoreCase)
    {
        "MX",  // SAT CFDI 4.0 (único activo hoy)
        // "CO",  // Futuro: DIAN
        // "PE",  // Futuro: SUNAT
    };

    private static readonly Dictionary<string, string> NameToIso = new(StringComparer.OrdinalIgnoreCase)
    {
        { "México", "MX" },
        { "Mexico", "MX" },
        // { "Colombia", "CO" },
        // { "Perú", "PE" },
        // { "Peru", "PE" },
    };

    public static bool IsSupported(string? country)
        => !string.IsNullOrEmpty(country) && SupportedCountries.Contains(NormalizeToIso(country));

    public static string NormalizeToIso(string country)
    {
        if (string.IsNullOrEmpty(country)) return string.Empty;
        var trimmed = country.Trim();
        if (trimmed.Length == 2) return trimmed.ToUpperInvariant();
        return NameToIso.TryGetValue(trimmed, out var iso) ? iso : trimmed;
    }
}
