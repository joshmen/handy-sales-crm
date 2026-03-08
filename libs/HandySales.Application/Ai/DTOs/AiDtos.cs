namespace HandySales.Application.Ai.DTOs;

public record AiRequestDto(
    string TipoAccion,
    string Prompt,
    string? Contexto = null
);

public record AiResponseDto(
    string Respuesta,
    int CreditosUsados,
    int CreditosRestantes,
    int LatenciaMs
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
