namespace HandySuites.Application.Common.Time;

/// <summary>
/// Helpers para normalizar DateTime entrantes desde mobile sync push.
///
/// Mobile siempre envia fechas via Date.prototype.toISOString() que produce
/// strings UTC con sufijo 'Z'. Pero ASP.NET Core Minimal APIs deserializa el
/// JSON con System.Text.Json y devuelve DateTime con Kind=Unspecified — la 'Z'
/// se pierde porque .NET no preserva Kind sin configuracion explicita.
///
/// Combinado con Npgsql.EnableLegacyTimestampBehavior=true (Program.cs:17) que
/// acepta DateTimeKind.Unspecified en columnas timestamp without time zone, el
/// resultado es que el valor se almacena tal cual sin saber que era UTC.
///
/// Esto causo bug prod (2026-06-02): fecha_gasto de mobile aparecia 7h
/// adelantada en BD para vendedores en Mazatlan (UTC-7).
///
/// La normalizacion aqui asume UTC para cualquier DateTime con Kind=Unspecified
/// — defensive contra la deserializacion default de System.Text.Json. Los
/// timestamps Local se convierten a UTC con ToUniversalTime().
/// </summary>
public static class DateTimeNormalization
{
    /// <summary>
    /// Garantiza que el valor tenga Kind=Utc. Si llega Unspecified asume UTC
    /// (caso normal de mobile sync push tras deserializacion JSON).
    /// </summary>
    public static DateTime EnsureUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    /// <summary>
    /// Overload nullable. Devuelve null si entrada es null.
    /// </summary>
    public static DateTime? EnsureUtc(DateTime? value) =>
        value.HasValue ? EnsureUtc(value.Value) : null;
}
