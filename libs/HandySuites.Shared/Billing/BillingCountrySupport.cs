namespace HandySuites.Shared.Billing;

/// <summary>
/// Registro de países donde Handy Suites tiene integración fiscal implementada.
/// Agregar un país aquí requiere también:
///   1. Adapter/provider en Billing API (SAT, DIAN, SUNAT, etc.)
///   2. Modal de datos fiscales específico en mobile (fields varían por país)
///   3. Config de PAC/proveedor en appsettings o env vars
/// </summary>
public static class BillingCountrySupport
{
    // ISO-3166-1 alpha-2. Mantener ordenado alfabéticamente.
    private static readonly HashSet<string> SupportedCountries = new(StringComparer.OrdinalIgnoreCase)
    {
        "MX",  // SAT CFDI 4.0 (único activo hoy)
        // "CO",  // Futuro: DIAN
        // "PE",  // Futuro: SUNAT
    };

    /// <summary>
    /// Mapeo de nombres de país (ES/EN) a código ISO-3166-1 alpha-2. Permite que
    /// fuentes legadas que guarden "México"/"Mexico" sigan validándose contra
    /// SupportedCountries. Cuando se agregue otro país soportado, agregar
    /// también sus alias acá.
    /// </summary>
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

    /// <summary>
    /// Convierte un valor de país a su código ISO-2. Si ya viene en ISO-2 lo
    /// devuelve normalizado a uppercase; si viene en nombre largo (ej "México")
    /// lo busca en el mapa. Si no se reconoce, devuelve el valor tal cual para
    /// que IsSupported responda false sin lanzar.
    /// </summary>
    public static string NormalizeToIso(string country)
    {
        if (string.IsNullOrEmpty(country)) return string.Empty;
        var trimmed = country.Trim();
        if (trimmed.Length == 2) return trimmed.ToUpperInvariant();
        return NameToIso.TryGetValue(trimmed, out var iso) ? iso : trimmed;
    }

    public static IReadOnlySet<string> All => SupportedCountries;
}
