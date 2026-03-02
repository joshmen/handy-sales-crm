using System.Security.Claims;
using HandySales.Application.Automations.DTOs;
using HandySales.Application.Automations.Services;
using Microsoft.AspNetCore.Mvc;

namespace HandySales.Api.Endpoints;

public static class AutomationEndpoints
{
    public static void MapAutomationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/automations")
            .RequireAuthorization()
            .WithTags("Automations")
            .WithOpenApi();

        // Catálogo completo con estado por tenant
        group.MapGet("/templates", async (
            HttpContext context,
            [FromServices] AutomationAppService service) =>
        {
            var tenantId = GetTenantId(context);
            var templates = await service.GetTemplatesAsync(tenantId);
            return Results.Ok(templates);
        })
        .WithSummary("Catálogo de automatizaciones con estado por tenant");

        // Solo las activas del tenant
        group.MapGet("/mis-automaciones", async (
            HttpContext context,
            [FromServices] AutomationAppService service) =>
        {
            var tenantId = GetTenantId(context);
            var activas = await service.GetMisAutomacionesAsync(tenantId);
            return Results.Ok(activas);
        })
        .WithSummary("Automatizaciones activas del tenant");

        // Activar
        group.MapPost("/{slug}/activar", async (
            string slug,
            [FromBody] ActivarAutomationRequest? request,
            HttpContext context,
            [FromServices] AutomationAppService service) =>
        {
            var tenantId = GetTenantId(context);
            var userId = GetUserId(context);

            try
            {
                var id = await service.ActivarAsync(tenantId, userId, slug, request?.ParamsJson);
                return Results.Created($"/api/automations/{slug}", new { id });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        })
        .WithSummary("Activar automatización");

        // Desactivar
        group.MapPost("/{slug}/desactivar", async (
            string slug,
            HttpContext context,
            [FromServices] AutomationAppService service) =>
        {
            var tenantId = GetTenantId(context);
            var ok = await service.DesactivarAsync(tenantId, slug);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Desactivar automatización");

        // Configurar parámetros
        group.MapPut("/{slug}/configurar", async (
            string slug,
            [FromBody] ConfigurarAutomationRequest request,
            HttpContext context,
            [FromServices] AutomationAppService service) =>
        {
            var tenantId = GetTenantId(context);
            var ok = await service.ConfigurarAsync(tenantId, slug, request.ParamsJson);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Configurar parámetros de automatización");

        // Historial general
        group.MapGet("/historial", async (
            [FromQuery] int page,
            [FromQuery] int pageSize,
            [FromQuery] string? slug,
            HttpContext context,
            [FromServices] AutomationAppService service) =>
        {
            var tenantId = GetTenantId(context);
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var (items, total) = await service.GetHistorialAsync(tenantId, page, pageSize, slug);
            context.Response.Headers["X-Total-Count"] = total.ToString();
            return Results.Ok(items);
        })
        .WithSummary("Historial de ejecuciones con paginación");
    }

    private static int GetTenantId(HttpContext context)
    {
        var claim = context.User.FindFirst("tenant_id")?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private static int GetUserId(HttpContext context)
    {
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? context.User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }
}
