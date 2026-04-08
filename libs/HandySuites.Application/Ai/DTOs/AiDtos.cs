namespace HandySuites.Application.Ai.DTOs;

public record AiRequestDto(
    string TipoAccion,
    string Prompt,
    string? Contexto = null
);

public record AiResponseDto(
    string Respuesta,
    int CreditosUsados,
    int CreditosRestantes,
    int LatenciaMs,
    List<AiSuggestedAction>? AccionesSugeridas = null
);

public record AiSuggestedAction(
    string ActionId,
    string ActionType,
    string Label,
    string Description,
    string Icon,
    int CreditCost,
    object Parameters
);

public record AiActionExecuteRequest(
    string ActionId,
    string ActionType
);

public record AiActionExecuteResult(
    bool Success,
    string Message,
    int CreditosUsados,
    int CreditosRestantes,
    List<int>? CreatedIds = null
);

public record AiUsageStatsDto(
    int TotalRequests,
    int TotalCreditos,
    Dictionary<string, int> PorTipoAccion,
    List<AiUsageItemDto> UltimosUsos
);

public record AiUsageItemDto(
    long Id,
    string TipoAccion,
    int CreditosCobrados,
    string PromptResumen,
    int LatenciaMs,
    bool Exitoso,
    DateTime CreadoEn,
    string? NombreUsuario = null
);
