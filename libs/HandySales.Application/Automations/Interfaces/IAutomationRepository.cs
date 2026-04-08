using HandySuites.Application.Automations.DTOs;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Automations.Interfaces;

public interface IAutomationRepository
{
    Task<List<AutomationTemplateDto>> GetTemplatesWithTenantStatusAsync(int tenantId);
    Task<List<AutomationTemplateDto>> GetActiveByTenantAsync(int tenantId);
    Task<AutomationTemplate?> GetTemplateBySlugAsync(string slug);
    Task<TenantAutomation?> GetTenantAutomationAsync(int tenantId, int templateId);
    Task<List<TenantAutomation>> GetActiveTenantAutomationsAsync(int tenantId);
    Task<List<TenantAutomation>> GetAllActiveTenantAutomationsAsync();
    Task<int> ActivarAsync(int tenantId, int templateId, int userId, string? paramsJson);
    Task<bool> DesactivarAsync(int tenantId, int templateId);
    Task<bool> ConfigurarAsync(int tenantId, int templateId, string paramsJson);
    Task<(List<AutomationExecutionDto> Items, int Total)> GetHistorialAsync(int tenantId, int page, int pageSize, string? slug = null);
    Task LogExecutionAsync(AutomationExecution execution);
    Task UpdateLastExecutedAsync(int automationId);
    Task LogAndUpdateAsync(AutomationExecution execution, int automationId);
}
