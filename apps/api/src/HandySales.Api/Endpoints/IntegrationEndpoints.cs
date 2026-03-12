using HandySales.Application.Integrations.DTOs;
using HandySales.Application.Integrations.Services;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class IntegrationEndpoints
{
    public static void MapIntegrationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/integrations")
            .RequireAuthorization()
            .RequireCors("HandySalesPolicy");

        group.MapGet("/", GetCatalog)
            .WithName("GetIntegrationCatalog")
            .WithSummary("Catálogo de integraciones con estado de activación del tenant");

        group.MapGet("/mine", GetMyIntegrations)
            .WithName("GetMyIntegrations")
            .WithSummary("Integraciones activas del tenant");

        group.MapGet("/{slug}", GetBySlug)
            .WithName("GetIntegrationBySlug")
            .WithSummary("Detalle de una integración");

        group.MapPost("/{slug}/activate", Activate)
            .WithName("ActivateIntegration")
            .WithSummary("Activa una integración para el tenant");

        group.MapPost("/{slug}/deactivate", Deactivate)
            .WithName("DeactivateIntegration")
            .WithSummary("Desactiva una integración del tenant");
    }

    private static async Task<IResult> GetCatalog(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IntegrationService service)
    {
        var catalog = await service.GetCatalogAsync(currentTenant.TenantId);
        return Results.Ok(catalog);
    }

    private static async Task<IResult> GetMyIntegrations(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IntegrationService service)
    {
        var integrations = await service.GetMyIntegrationsAsync(currentTenant.TenantId);
        return Results.Ok(integrations);
    }

    private static async Task<IResult> GetBySlug(
        string slug,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IntegrationService service)
    {
        var integration = await service.GetBySlugAsync(slug, currentTenant.TenantId);
        if (integration == null)
            return Results.NotFound(new { message = "Integración no encontrada" });
        return Results.Ok(integration);
    }

    private static async Task<IResult> Activate(
        string slug,
        [FromBody] ActivateIntegrationRequest? request,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IntegrationService service)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        try
        {
            var result = await service.ActivateAsync(
                currentTenant.TenantId, slug, int.Parse(currentTenant.UserId), request?.Configuracion);
            return Results.Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> Deactivate(
        string slug,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IntegrationService service)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        try
        {
            await service.DeactivateAsync(currentTenant.TenantId, slug, int.Parse(currentTenant.UserId));
            return Results.Ok(new { message = "Integración desactivada" });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }
}
