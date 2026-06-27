using HandySuites.Application.Onboarding.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Onboarding.Interfaces;

public interface IOnboardingRepository
{
    Task<CasoOnboardingResumenDto> GetResumenAsync();
    Task<CasoOnboardingDto?> GetByIdAsync(int id);
    Task<CasoOnboarding?> GetEntityByIdAsync(int id);
    Task<int> CreateAsync(CasoOnboarding caso);
    Task<bool> UpdateAsync(CasoOnboarding caso);
}
