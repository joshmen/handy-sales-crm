using HandySales.Application.Ai.DTOs;

namespace HandySales.Application.Ai.Interfaces;

public interface IAiGatewayService
{
    Task<AiResponseDto> ProcessRequestAsync(AiRequestDto request, int tenantId, int userId);
}
