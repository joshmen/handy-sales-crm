using System.Text.Json;
using HandySuites.Application.Automations.DTOs;
using HandySuites.Application.Automations.Interfaces;

namespace HandySuites.Application.Automations.Services;

public class AutomationAppService
{
    private const int MaxParamsJsonLength = 4096;
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

        if (paramsJson != null)
            ValidateParamsJson(paramsJson);

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
        ValidateParamsJson(paramsJson);

        var template = await _repo.GetTemplateBySlugAsync(slug);
        if (template == null) return false;
        return await _repo.ConfigurarAsync(tenantId, template.Id, paramsJson);
    }

    public Task<(List<AutomationExecutionDto> Items, int Total)> GetHistorialAsync(int tenantId, int page, int pageSize, string? slug = null)
        => _repo.GetHistorialAsync(tenantId, page, pageSize, slug);

    private static void ValidateParamsJson(string json)
    {
        if (json.Length > MaxParamsJsonLength)
            throw new InvalidOperationException($"Los parámetros exceden el tamaño máximo ({MaxParamsJsonLength} caracteres)");

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                throw new InvalidOperationException("Los parámetros deben ser un objeto JSON válido");
        }
        catch (JsonException)
        {
            throw new InvalidOperationException("Los parámetros no son JSON válido");
        }
    }
}
