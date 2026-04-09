using System.Security.Claims;
using HandySuites.Api.Automations;
using HandySuites.Application.Automations.DTOs;
using HandySuites.Application.Automations.Interfaces;
using HandySuites.Application.Automations.Services;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Email;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

public static class AutomationEndpoints
{
    public static void MapAutomationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/automations")
            .RequireAuthorization()
            .WithTags("Automations")
            .WithOpenApi();

        // Catálogo completo con estado por tenant (read — any authenticated user)
        group.MapGet("/templates", async (
            HttpContext context,
            [FromServices] AutomationAppService service,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            var tenantId = GetTenantId(context);
            if (tenantId <= 0) return Results.Unauthorized();
            var templates = await service.GetTemplatesAsync(tenantId);
            return Results.Ok(templates);
        })
        .WithSummary("Catálogo de automatizaciones con estado por tenant");

        // Solo las activas del tenant (read — any authenticated user)
        group.MapGet("/mis-automaciones", async (
            HttpContext context,
            [FromServices] AutomationAppService service) =>
        {
            var tenantId = GetTenantId(context);
            if (tenantId <= 0) return Results.Unauthorized();
            var activas = await service.GetMisAutomacionesAsync(tenantId);
            return Results.Ok(activas);
        })
        .WithSummary("Automatizaciones activas del tenant");

        // Activar (write — ADMIN/SUPER_ADMIN only)
        group.MapPost("/{slug}/activar", async (
            string slug,
            [FromBody] ActivarAutomationRequest? request,
            HttpContext context,
            [FromServices] AutomationAppService service,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (currentTenant.Role is not ("ADMIN" or "SUPER_ADMIN")) return Results.Forbid();
            var tenantId = GetTenantId(context);
            if (tenantId <= 0) return Results.Unauthorized();
            var userId = GetUserId(context);
            if (userId <= 0) return Results.Unauthorized();

            // Validate subscription is active (Trial or Active)
            var db = context.RequestServices.GetRequiredService<HandySuitesDbContext>();
            var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId);
            if (tenant?.SubscriptionStatus is not ("Trial" or "Active"))
                return Results.Json(new { error = "Tu suscripción ha expirado. Suscríbete para activar automatizaciones." }, statusCode: 402);

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

        // Desactivar (write — ADMIN/SUPER_ADMIN only)
        group.MapPost("/{slug}/desactivar", async (
            string slug,
            HttpContext context,
            [FromServices] AutomationAppService service,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (currentTenant.Role is not ("ADMIN" or "SUPER_ADMIN")) return Results.Forbid();
            var tenantId = GetTenantId(context);
            if (tenantId <= 0) return Results.Unauthorized();
            var ok = await service.DesactivarAsync(tenantId, slug);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Desactivar automatización");

        // Configurar parámetros (write — ADMIN/SUPER_ADMIN only)
        group.MapPut("/{slug}/configurar", async (
            string slug,
            [FromBody] ConfigurarAutomationRequest request,
            HttpContext context,
            [FromServices] AutomationAppService service,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (currentTenant.Role is not ("ADMIN" or "SUPER_ADMIN")) return Results.Forbid();
            var tenantId = GetTenantId(context);
            if (tenantId <= 0) return Results.Unauthorized();
            var ok = await service.ConfigurarAsync(tenantId, slug, request.ParamsJson);
            return ok ? Results.NoContent() : Results.NotFound();
        })
        .WithSummary("Configurar parámetros de automatización");

        // Historial general (read — ADMIN/SUPER_ADMIN only, contains execution details)
        group.MapGet("/historial", async (
            [FromQuery] int page,
            [FromQuery] int pageSize,
            [FromQuery] string? slug,
            HttpContext context,
            [FromServices] AutomationAppService service,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (currentTenant.Role is not ("ADMIN" or "SUPER_ADMIN")) return Results.Forbid();
            var tenantId = GetTenantId(context);
            if (tenantId <= 0) return Results.Unauthorized();
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var (items, total) = await service.GetHistorialAsync(tenantId, page, pageSize, slug);
            context.Response.Headers["X-Total-Count"] = total.ToString();
            return Results.Ok(items);
        })
        .WithSummary("Historial de ejecuciones con paginación");

        // Manual trigger for testing (ADMIN/SUPER_ADMIN only)
        group.MapPost("/{slug}/test", async (
            string slug,
            HttpContext context,
            [FromServices] IAutomationRepository repo,
            [FromServices] IEnumerable<IAutomationHandler> handlers,
            [FromServices] HandySuitesDbContext db,
            [FromServices] INotificationService notifications,
            [FromServices] ICurrentTenant currentTenant,
            CancellationToken ct) =>
        {
            if (currentTenant.Role is not ("ADMIN" or "SUPER_ADMIN")) return Results.Forbid();
            var tenantId = GetTenantId(context);
            if (tenantId <= 0) return Results.Unauthorized();

            // Verify active subscription before allowing test execution
            var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant?.SubscriptionStatus is not ("Trial" or "Active"))
                return Results.Json(new { error = "Tu suscripción ha expirado. Suscríbete para ejecutar automatizaciones." }, statusCode: 402);

            var template = await repo.GetTemplateBySlugAsync(slug);
            if (template == null) return Results.NotFound(new { error = $"Template '{slug}' not found" });

            var handler = handlers.FirstOrDefault(h => h.Slug == slug);
            if (handler == null) return Results.NotFound(new { error = $"No handler for '{slug}'" });

            // Find or create a TenantAutomation for context
            var automation = await repo.GetTenantAutomationAsync(tenantId, template.Id);
            if (automation == null)
            {
                // Create a temporary one with default params for testing
                automation = new TenantAutomation
                {
                    TenantId = tenantId,
                    TemplateId = template.Id,
                    ParamsJson = template.DefaultParamsJson,
                    Activo = false,
                };
                // Load template navigation property
                automation.Template = template;
            }
            else
            {
                // Ensure template is loaded
                if (automation.Template == null)
                    automation.Template = template;
            }

            IEmailService? emailService = context.RequestServices.GetService<IEmailService>();
            var automationContext = new AutomationContext(automation, db, notifications, emailService);

            try
            {
                var result = await handler.ExecuteAsync(automationContext, ct);

                // Log execution only if automation has a real DB record
                if (automation.Id > 0)
                {
                    await repo.LogExecutionAsync(new AutomationExecution
                    {
                        TenantId = tenantId,
                        AutomationId = automation.Id,
                        TemplateSlug = slug,
                        Status = result.Success ? ExecutionStatus.Success : ExecutionStatus.Failed,
                        ActionTaken = $"[TEST] {result.ActionTaken}",
                        ErrorMessage = result.Error,
                        EjecutadoEn = DateTime.UtcNow,
                    });
                }

                return Results.Ok(new { success = result.Success, action = result.ActionTaken, error = result.Error });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, action = "", error = "Error al ejecutar la acción." });
            }
        })
        .WithSummary("Ejecutar automatización manualmente para pruebas");
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
