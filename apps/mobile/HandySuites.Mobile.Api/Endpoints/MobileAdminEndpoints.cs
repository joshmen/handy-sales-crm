using HandySuites.Application.DTOs;
using HandySuites.Application.Interfaces;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

/// <summary>
/// Parte B: super admin movil. Permite al SUPER_ADMIN listar empresas (tenants)
/// y entrar a una en modo soporte READ_ONLY (impersonation), reusando el
/// ImpersonationService de la plataforma (misma auditoria + mismo JWT). Todos
/// los endpoints exigen rol SUPER_ADMIN.
/// </summary>
public static class MobileAdminEndpoints
{
    public static void MapMobileAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/admin")
            .RequireAuthorization()
            .WithTags("Admin (Super Admin)")
            .WithOpenApi();

        // GET /api/mobile/admin/tenants?q=...  -> lista de empresas para el picker
        group.MapGet("/tenants", async (
            ICurrentTenant tenant,
            HandySuitesDbContext db,
            [FromQuery] string? q) =>
        {
            if (!tenant.IsSuperAdmin) return Results.Forbid();

            // IgnoreQueryFilters: el super admin no esta scopeado a un tenant.
            var query = db.Tenants.AsNoTracking().IgnoreQueryFilters()
                .Where(t => t.EliminadoEn == null);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                query = query.Where(t => t.NombreEmpresa.ToLower().Contains(term));
            }

            var tenants = await query
                .OrderBy(t => t.NombreEmpresa)
                .Select(t => new
                {
                    id = t.Id,
                    nombre = t.NombreEmpresa,
                    plan = t.PlanTipo,
                    activo = t.Activo,
                    estadoSuscripcion = t.SubscriptionStatus,
                    usuarios = db.Usuarios.IgnoreQueryFilters()
                        .Count(u => u.TenantId == t.Id && u.EliminadoEn == null && u.Activo),
                })
                .ToListAsync();

            return Results.Ok(new { success = true, data = tenants });
        })
        .WithSummary("Lista de empresas (tenants) para el super admin");

        // POST /api/mobile/admin/impersonate  -> entra a un tenant en READ_ONLY
        group.MapPost("/impersonate", async (
            MobileImpersonateRequest body,
            ICurrentTenant tenant,
            HttpContext context,
            [FromServices] IImpersonationService service) =>
        {
            if (!tenant.IsSuperAdmin) return Results.Forbid();
            if (!int.TryParse(tenant.UserId, out var superAdminId)) return Results.Unauthorized();
            if (body.TargetTenantId <= 0)
                return Results.BadRequest(new { success = false, message = "targetTenantId es requerido" });

            // El movil es SIEMPRE READ_ONLY: el super admin solo VE datos del
            // tenant. El sync push queda bloqueado bajo impersonation.
            var request = new StartImpersonationRequest
            {
                TargetTenantId = body.TargetTenantId,
                Reason = string.IsNullOrWhiteSpace(body.Reason) ? "Soporte movil (solo lectura)" : body.Reason!,
                AccessLevel = "READ_ONLY",
            };

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var ua = context.Request.Headers.UserAgent.FirstOrDefault();
            var correlationId = context.TraceIdentifier;

            try
            {
                var response = await service.StartSessionAsync(request, superAdminId, ip, ua, correlationId);
                return Results.Ok(new
                {
                    success = true,
                    token = response.ImpersonationToken,
                    sessionId = response.SessionId,
                    tenantId = body.TargetTenantId,
                    tenantName = response.TenantName,
                    accessLevel = response.AccessLevel,
                    expiresAt = response.ExpiresAt,
                });
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { success = false, message = ex.Message }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { success = false, message = ex.Message }); }
        })
        .WithSummary("Entra a un tenant en modo soporte READ_ONLY");

        // POST /api/mobile/admin/stop-impersonation  -> sale del tenant
        group.MapPost("/stop-impersonation", async (
            MobileStopImpersonationRequest body,
            ICurrentTenant tenant,
            [FromServices] IImpersonationService service) =>
        {
            // Se llama con el token impersonado (role=SUPER_ADMIN, sub=superAdminId).
            if (!int.TryParse(tenant.UserId, out var superAdminId)) return Results.Unauthorized();
            if (body.SessionId == Guid.Empty)
                return Results.BadRequest(new { success = false, message = "sessionId es requerido" });

            try
            {
                await service.EndSessionAsync(body.SessionId, superAdminId);
                return Results.Ok(new { success = true });
            }
            catch (UnauthorizedAccessException) { return Results.Forbid(); }
            catch (Exception ex) { return Results.BadRequest(new { success = false, message = ex.Message }); }
        })
        .WithSummary("Sale del modo soporte (termina la impersonation)");
    }
}

public record MobileImpersonateRequest(int TargetTenantId, string? Reason);
public record MobileStopImpersonationRequest(Guid SessionId);
