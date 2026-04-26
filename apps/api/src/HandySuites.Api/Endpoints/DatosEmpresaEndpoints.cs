using HandySuites.Api.Hubs;
using HandySuites.Application.BillingSync;
using HandySuites.Application.DatosEmpresa.DTOs;
using HandySuites.Application.DatosEmpresa.Interfaces;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Api.Endpoints;

public static class DatosEmpresaEndpoints
{
    public static void MapDatosEmpresaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/datos-empresa")
            .RequireAuthorization()
            .WithTags("Datos de Empresa");

        // GET /api/datos-empresa
        group.MapGet("/", async (
            HttpContext context,
            [FromServices] IDatosEmpresaService service,
            [FromServices] ICurrentTenant currentTenant) =>
        {
            if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                return Results.Forbid();

            var result = await service.GetAsync();
            return result != null
                ? Results.Ok(result)
                : Results.NotFound("Datos de empresa no encontrados");
        })
        .WithName("GetDatosEmpresa")
        .WithSummary("Obtener datos de empresa del tenant actual")
        .Produces<DatosEmpresaDto>();

        // PUT /api/datos-empresa
        group.MapPut("/", async (
            DatosEmpresaUpdateDto request,
            HttpContext context,
            [FromServices] IDatosEmpresaService service,
            [FromServices] IBillingSyncService billingSync,
            [FromServices] ICurrentTenant currentTenant,
            [FromServices] IHubContext<NotificationHub> hubContext,
            CancellationToken ct) =>
        {
            if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
                return Results.Forbid();

            var userIdClaim = context.User.FindFirst("userId")?.Value
                             ?? context.User.FindFirst("sub")?.Value
                             ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            var result = await service.UpdateAsync(request, userId.ToString());

            // Replicar campos duplicados a Billing API (ConfiguracionFiscal en handy_billing).
            // Forwardeamos el JWT del usuario para que Billing API aplique RLS y query filters
            // normalmente — el sync NO bypassa seguridad multi-tenant.
            // Fallos de sync se loguean como WARN, no rompen el flujo principal.
            var authHeader = context.Request.Headers.Authorization.ToString();
            var userJwt = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? authHeader.Substring("Bearer ".Length).Trim()
                : string.Empty;

            await billingSync.SyncDatosEmpresaAsync(new SyncDatosEmpresaDto(
                result.TenantId,
                result.IdentificadorFiscal,
                result.RazonSocial,
                result.Direccion,
                result.CodigoPostal), userJwt, ct);

            // Notificar a clients del tenant para que invaliden el cache de empresa
            // (mobile useEmpresa staleTime 1h se actualiza inmediatamente).
            await hubContext.Clients.Group($"tenant:{result.TenantId}").SendAsync("EmpresaUpdated", ct);

            return Results.Ok(result);
        })
        .WithName("UpdateDatosEmpresa")
        .WithSummary("Actualizar datos de empresa")
        .Accepts<DatosEmpresaUpdateDto>("application/json")
        .Produces<DatosEmpresaDto>();
    }
}
