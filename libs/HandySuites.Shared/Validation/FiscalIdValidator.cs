using System.Text.RegularExpressions;

namespace HandySuites.Shared.Validation;

/// <summary>
/// Validates LATAM fiscal identifiers by country type.
/// </summary>
public static class FiscalIdValidator
{
    private static readonly Dictionary<string, (Regex Pattern, string Example)> Validators = new(StringComparer.OrdinalIgnoreCase)
    {
        ["RFC"]  = (new Regex(@"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$", RegexOptions.Compiled), "XAXX010101000"),
        ["NIT"]  = (new Regex(@"^\d{9}-?\d$", RegexOptions.Compiled), "900123456-7"),
        ["CUIT"] = (new Regex(@"^\d{2}-?\d{8}-?\d$", RegexOptions.Compiled), "20-12345678-9"),
        ["CNPJ"] = (new Regex(@"^\d{14}$", RegexOptions.Compiled), "12345678000190"),
        ["RUT"]  = (new Regex(@"^\d{7,8}-?[\dkK]$", RegexOptions.Compiled), "12345678-9"),
        ["RUC"]  = (new Regex(@"^\d{11}$", RegexOptions.Compiled), "20123456789"),
    };

    /// <summary>
    /// Validates the fiscal ID format for the given type.
    /// Returns null if valid, or an error message if invalid.
    /// </summary>
    public static string? Validate(string? identificadorFiscal, string? tipo)
    {
        if (string.IsNullOrWhiteSpace(identificadorFiscal))
            return null; // Empty is OK — not required at signup

        tipo ??= "RFC";

        if (!Validators.TryGetValue(tipo, out var validator))
            return $"Tipo de identificador fiscal desconocido: {tipo}";

        if (!validator.Pattern.IsMatch(identificadorFiscal))
            return $"El formato del {tipo} no es válido. Ejemplo: {validator.Example}";

        return null;
    }

    /// <summary>
    /// Returns all supported fiscal ID types.
    /// </summary>
    public static IReadOnlyList<string> SupportedTypes => ["RFC", "NIT", "CUIT", "CNPJ", "RUT", "RUC"];
}
