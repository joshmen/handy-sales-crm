using HandySuites.Application.Ai.DTOs;

namespace HandySuites.Application.Ai.Interfaces;

public interface IAiActionDetector
{
    Task<List<AiSuggestedAction>> DetectActionsAsync(
        string prompt, List<string> categoriesUsed, int tenantId, int userId);

    /// <summary>
    /// Validates that an action ID was recently suggested and returns its cached parameters.
    /// One-time use: removes from cache after validation.
    /// </summary>
    (string ActionType, object Parameters)? ValidateActionId(string actionId, int tenantId);
}
