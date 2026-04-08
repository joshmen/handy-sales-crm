namespace HandySuites.Application.Ai.Interfaces;

public interface IAiSanitizer
{
    SanitizationResult Sanitize(string userInput);
}

public record SanitizationResult(bool IsClean, string? BlockedReason = null);
