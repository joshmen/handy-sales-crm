using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Application.Telemetry.Interfaces;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// B.2 — Dashboard admin sync-health (fix prod 2026-06-03 post-incidente Rodrigo).
///
/// El supervisor o admin consulta este endpoint para detectar vendedores con
/// backlog de sincronización ANTES de que se pierda data:
///   "Rodrigo lleva 2h con 32 pedidos pendientes" → call al vendedor.
///
/// SUPER_ADMIN puede ver todos los tenants pasando ?allTenants=true.
/// ADMIN/SUPERVISOR solo ve su tenant.
/// </summary>
public static class AdminSyncHealthEndpoints
{
    public static void MapAdminSyncHealthEndpoints(this IEndpointRouteBuilder app)
    {
        // Default thresholds:
        //   minPending = 10 records pendientes (algo notable, no ruido)
        //   minStale = 30 min sin recibir heartbeat (sospechoso)
        // El supervisor puede afinarlos vía query params si quiere ver más
        // o menos casos.
        app.MapGet("/api/admin/sync-health", async (
            [FromServices] ISyncTelemetryService telemetry,
            [FromServices] ICurrentTenant currentTenant,
            [FromQuery] int? minPending,
            [FromQuery] int? minStaleMinutes,
            [FromQuery] bool? allTenants) =>
        {
            // Sprint pre-prod #12.5 (security review 2026-06-06): privilege
            // escalation via query param — un ADMIN o SUPERVISOR podia pasar
            // `?allTenants=true` y obtener telemetria cross-tenant. El check
            // RequireRole solo autoriza el endpoint, no el parametro.
            // Fix: el flag allTenants solo aplica si el caller es SUPER_ADMIN;
            // para cualquier otro rol queda forzado a false.
            var effectiveAllTenants = (allTenants ?? false) && currentTenant.IsSuperAdmin;
            if ((allTenants ?? false) && !currentTenant.IsSuperAdmin)
            {
                return Results.Forbid();
            }

            var result = await telemetry.GetSyncHealthAsync(
                minPendingThreshold: minPending ?? 10,
                minStaleMinutes: minStaleMinutes ?? 30,
                allTenants: effectiveAllTenants);

            return Results.Ok(new { success = true, data = result });
        })
        .RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN", "SUPERVISOR"))
        .WithTags("Admin Sync Health")
        .WithSummary("Vendedores con backlog de sincronización")
        .WithDescription("Lista vendedores cuya última telemetría reporta >= N pendings hace >= M min. Permite intervención proactiva pre-pérdida de datos.");

        // C.1 — Drafts huérfanos (fix prod 2026-06-03 post-incidente Rodrigo).
        // Lista Pedidos en Estado=Borrador >= N min. Caso uso: supervisor ve
        // "Rodrigo tiene 32 pedidos Borrador hace 2h" → llama al vendedor para
        // confirmar/cancelar/finalizar. Reactivo al caso de los 32 pedidos
        // perdidos que tenían eager-save server-side (con B.1 en plaza).
        app.MapGet("/api/admin/pedidos/drafts", async (
            [FromServices] IPedidoRepository repo,
            [FromServices] ICurrentTenant tenant,
            [FromQuery] int? minAgeMinutes,
            [FromQuery] int? usuarioId) =>
        {
            // Default: drafts hace >= 30 min son sospechosos.
            var minAge = minAgeMinutes ?? 30;
            var cutoffDate = DateTime.UtcNow.AddMinutes(-minAge);

            var drafts = await repo.GetOrphanDraftsAsync(cutoffDate, tenant.TenantId, usuarioId);

            return Results.Ok(new
            {
                success = true,
                data = new OrphanDraftsResponseDto(
                    Drafts: drafts,
                    GeneratedAt: DateTime.UtcNow,
                    MinAgeMinutes: minAge,
                    FilterByUsuarioId: usuarioId
                )
            });
        })
        .RequireAuthorization(p => p.RequireRole("ADMIN", "SUPER_ADMIN", "SUPERVISOR"))
        .WithTags("Admin Sync Health")
        .WithSummary("Drafts huérfanos (pedidos en Borrador)")
        .WithDescription("Lista Pedidos en Estado=Borrador hace >= N min. Caso uso: supervisor inspecciona drafts de un vendedor que tenía backlog para decidir si recuperar o cancelar.");
    }
}
