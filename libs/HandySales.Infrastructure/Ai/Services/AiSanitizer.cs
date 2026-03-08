using System.Text.RegularExpressions;
using HandySales.Application.Ai.Interfaces;

namespace HandySales.Infrastructure.Ai.Services;

public class AiSanitizer : IAiSanitizer
{
    private static readonly string[] BlockedWords =
    {
        "contrase\u00f1a", "password", "secret", "token", "api_key", "apikey",
        "clave privada", "private key", "connection string", "cadena de conexi\u00f3n",
        "drop table", "delete from", "truncate", "alter table",
        "ignore instrucciones", "ignore previous", "olvida instrucciones",
        "olvida las instrucciones", "forget instructions", "forget your instructions",
        "ignore your instructions", "system prompt", "prompt del sistema",
        "act as", "pretend you are", "you are now", "jailbreak",
        "base64", "exec(", "eval("
    };

    private static readonly Regex[] BlockedPatterns =
    {
        // SQL injection patterns
        new(@"(--|;|'|"")\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        // Prompt injection: trying to override system prompt
        new(@"(\[SYSTEM\]|\[INST\]|<<SYS>>|<\|im_start\|>)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        // RFC/CURP/credential extraction requests
        new(@"(dame|mu\u00e9strame|lista|extrae).{0,30}(RFC|CURP|INE|contrase\u00f1a|password|credencial)", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        // Email/phone mass extraction
        new(@"(dame|extrae|lista).{0,30}(correos?|emails?|tel\u00e9fonos?|n\u00fameros)", RegexOptions.IgnoreCase | RegexOptions.Compiled)
    };

    public SanitizationResult Sanitize(string userInput)
    {
        if (string.IsNullOrWhiteSpace(userInput))
            return new SanitizationResult(false, "El prompt no puede estar vac\u00edo.");

        if (userInput.Length > 2000)
            return new SanitizationResult(false, "El prompt excede el l\u00edmite de 2000 caracteres.");

        var lower = userInput.ToLower();

        // Check blocked words
        foreach (var word in BlockedWords)
        {
            if (lower.Contains(word))
                return new SanitizationResult(false, "Tu solicitud contiene t\u00e9rminos no permitidos. Por favor reformula tu pregunta sobre el negocio.");
        }

        // Check blocked patterns
        foreach (var pattern in BlockedPatterns)
        {
            if (pattern.IsMatch(userInput))
                return new SanitizationResult(false, "Tu solicitud contiene patrones no permitidos. Por favor reformula tu pregunta sobre el negocio.");
        }

        return new SanitizationResult(true);
    }
}
