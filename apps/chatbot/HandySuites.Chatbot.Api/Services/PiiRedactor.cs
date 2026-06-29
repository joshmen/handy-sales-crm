using System.Text.RegularExpressions;

namespace HandySuites.Chatbot.Api.Services;

/// <summary>
/// Enmascara PII (correo, telefono, RFC, CURP, tarjeta) en el texto que sale hacia OpenAI
/// (input del modelo, embeddings, moderacion, historial) y en la SALIDA del bot. El mensaje
/// del visitante se persiste tal cual (el asesor necesita verlo), pero el LLM nunca recibe PII.
/// </summary>
public static partial class PiiRedactor
{
    [GeneratedRegex(@"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")]
    private static partial Regex EmailRx();

    // Tarjeta: 13-16 digitos (con espacios/guiones). Va antes que telefono.
    [GeneratedRegex(@"\b(?:\d[ -]?){13,16}\b")]
    private static partial Regex CardRx();

    // Telefono MX: 10 digitos, opcional +52, con separadores.
    [GeneratedRegex(@"(?<!\d)(?:\+?52[\s-]?)?(?:\d[\s-]?){10}(?!\d)")]
    private static partial Regex PhoneRx();

    // RFC (persona fisica/moral), mayusculas tipicas.
    [GeneratedRegex(@"\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b")]
    private static partial Regex RfcRx();

    // CURP.
    [GeneratedRegex(@"\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b")]
    private static partial Regex CurpRx();

    public static string Redact(string? text)
    {
        if (string.IsNullOrEmpty(text)) return text ?? string.Empty;
        var s = text;
        s = EmailRx().Replace(s, "[correo]");
        s = CurpRx().Replace(s, "[curp]");
        s = RfcRx().Replace(s, "[rfc]");
        s = CardRx().Replace(s, "[tarjeta]");
        s = PhoneRx().Replace(s, "[telefono]");
        return s;
    }

    public static bool ContainsPii(string? text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        return EmailRx().IsMatch(text) || CurpRx().IsMatch(text) || RfcRx().IsMatch(text)
            || CardRx().IsMatch(text) || PhoneRx().IsMatch(text);
    }
}
