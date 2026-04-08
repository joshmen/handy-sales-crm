using HandySuites.Application.Ai.DTOs;

namespace HandySuites.Application.Ai.Interfaces;

public interface IAiGatewayService
{
    Task<AiResponseDto> ProcessRequestAsync(AiRequestDto request, int tenantId, int userId);
}
