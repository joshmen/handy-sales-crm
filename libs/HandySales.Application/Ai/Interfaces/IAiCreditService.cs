namespace HandySuites.Application.Ai.Interfaces;

public interface IAiCreditService
{
    Task<AiCreditBalanceDto> GetCurrentBalanceAsync(int tenantId);
    Task<bool> HasSufficientCreditsAsync(int tenantId, string tipoAccion);
    Task DeductCreditsAsync(int tenantId, string tipoAccion);
    Task<AiCreditBalanceDto> EnsureMonthlyBalanceAsync(int tenantId);
    Task AddExtraCreditsAsync(int tenantId, int credits);
    int GetCreditCost(string tipoAccion);
    int GetMonthlyAllocation(string planTipo);
}

public record AiCreditBalanceDto(
    int Asignados,
    int Usados,
    int Extras,
    int Disponibles,
    string Plan,
    int Mes,
    int Anio
);
