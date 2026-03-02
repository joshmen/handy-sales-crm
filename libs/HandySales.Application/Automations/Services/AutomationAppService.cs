using HandySales.Application.Automations.DTOs;
using HandySales.Application.Automations.Interfaces;

namespace HandySales.Application.Automations.Services;

public class AutomationAppService
{
    private readonly IAutomationRepository _repo;

    public AutomationAppService(IAutomationRepository repo)
    {
        _repo = repo;
    }

    public Task<List<AutomationTemplateDto>> GetTemplatesAsync(int tenantId)
        => _repo.GetTemplatesWithTenantStatusAsync(tenantId);

    public Task<List<AutomationTemplateDto>> GetMisAutomacionesAsync(int tenantId)
        => _repo.GetActiveByTenantAsync(tenantId);

    public async Task<int> ActivarAsync(int tenantId, int userId, string slug, string? paramsJson)
    {
        var template = await _repo.GetTemplateBySlugAsync(slug);
        if (template == null) throw new InvalidOperationException($"Template '{slug}' not found");

        var existing = await _repo.GetTenantAutomationAsync(tenantId, template.Id);
        if (existing != null && existing.Activo)
            throw new InvalidOperationException("Automation already active");

        return await _repo.ActivarAsync(tenantId, template.Id, userId, paramsJson ?? template.DefaultParamsJson);
    }

    public async Task<bool> DesactivarAsync(int tenantId, string slug)
    {
        var template = await _repo.GetTemplateBySlugAsync(slug);
        if (template == null) return false;
        return await _repo.DesactivarAsync(tenantId, template.Id);
    }

    public async Task<bool> ConfigurarAsync(int tenantId, string slug, string paramsJson)
    {
        var template = await _repo.GetTemplateBySlugAsync(slug);
        if (template == null) return false;
        return await _repo.ConfigurarAsync(tenantId, template.Id, paramsJson);
    }

    public Task<(List<AutomationExecutionDto> Items, int Total)> GetHistorialAsync(int tenantId, int page, int pageSize, string? slug = null)
        => _repo.GetHistorialAsync(tenantId, page, pageSize, slug);
}
