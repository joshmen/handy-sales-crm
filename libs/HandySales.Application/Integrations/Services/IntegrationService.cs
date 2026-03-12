using HandySales.Application.Integrations.DTOs;
using HandySales.Application.Integrations.Interfaces;

namespace HandySales.Application.Integrations.Services;

public class IntegrationService
{
    private readonly IIntegrationRepository _repo;

    public IntegrationService(IIntegrationRepository repo)
    {
        _repo = repo;
    }

    public async Task<List<IntegrationCatalogDto>> GetCatalogAsync(int tenantId)
    {
        var integrations = await _repo.GetAllCatalogAsync();
        var tenantIntegrations = await _repo.GetTenantIntegrationsAsync(tenantId);
        var activeMap = tenantIntegrations
            .Where(ti => ti.Estado == "ACTIVA")
            .ToDictionary(ti => ti.IntegrationId);

        return integrations.Select(i =>
        {
            activeMap.TryGetValue(i.Id, out var ti);
            return new IntegrationCatalogDto(
                i.Id, i.Slug, i.Nombre, i.Descripcion, i.Icono, i.Categoria,
                i.TipoPrecio, i.PrecioMXN, i.Estado,
                ti != null, ti?.FechaActivacion
            );
        }).ToList();
    }

    public async Task<IntegrationCatalogDto?> GetBySlugAsync(string slug, int tenantId)
    {
        var integration = await _repo.GetBySlugAsync(slug);
        if (integration == null) return null;

        var ti = await _repo.GetTenantIntegrationAsync(tenantId, integration.Id);
        var isActive = ti?.Estado == "ACTIVA";

        return new IntegrationCatalogDto(
            integration.Id, integration.Slug, integration.Nombre, integration.Descripcion,
            integration.Icono, integration.Categoria, integration.TipoPrecio,
            integration.PrecioMXN, integration.Estado,
            isActive, ti?.FechaActivacion
        );
    }

    public async Task<List<TenantIntegrationDto>> GetMyIntegrationsAsync(int tenantId)
    {
        var tenantIntegrations = await _repo.GetTenantIntegrationsAsync(tenantId);
        return tenantIntegrations
            .Where(ti => ti.Estado == "ACTIVA")
            .Select(ti => new TenantIntegrationDto(
                ti.Id, ti.IntegrationId, ti.Integration.Slug, ti.Integration.Nombre,
                ti.Integration.Icono, ti.Estado, ti.FechaActivacion, ti.Configuracion
            )).ToList();
    }

    public async Task<TenantIntegrationDto> ActivateAsync(int tenantId, string slug, int userId, string? configuracion)
    {
        var integration = await _repo.GetBySlugAsync(slug)
            ?? throw new InvalidOperationException($"Integración '{slug}' no encontrada");

        if (integration.Estado != "DISPONIBLE")
            throw new InvalidOperationException($"La integración '{integration.Nombre}' no está disponible");

        var existing = await _repo.GetTenantIntegrationAsync(tenantId, integration.Id);
        if (existing?.Estado == "ACTIVA")
            throw new InvalidOperationException($"La integración '{integration.Nombre}' ya está activa");

        var ti = await _repo.ActivateAsync(tenantId, integration.Id, userId, configuracion);
        await _repo.LogActionAsync(tenantId, integration.Id, userId, "activated", $"Integración {integration.Nombre} activada");

        return new TenantIntegrationDto(
            ti.Id, ti.IntegrationId, integration.Slug, integration.Nombre,
            integration.Icono, ti.Estado, ti.FechaActivacion, ti.Configuracion
        );
    }

    public async Task DeactivateAsync(int tenantId, string slug, int userId)
    {
        var integration = await _repo.GetBySlugAsync(slug)
            ?? throw new InvalidOperationException($"Integración '{slug}' no encontrada");

        var ti = await _repo.GetTenantIntegrationAsync(tenantId, integration.Id)
            ?? throw new InvalidOperationException($"No tienes esta integración activa");

        await _repo.DeactivateAsync(ti, userId);
        await _repo.LogActionAsync(tenantId, integration.Id, userId, "deactivated", $"Integración {integration.Nombre} desactivada");
    }
}
