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

    public static bool IsSupported(string? country)
        => !string.IsNullOrEmpty(country) && SupportedCountries.Contains(country);

    public static IReadOnlySet<string> All => SupportedCountries;
}
