using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// Endpoints transversales de la Consola de plataforma (Super Admin): conteos para
/// los badges del sidebar (Soporte, Cobros, Monitor de Errores).
/// </summary>
public static class ConsoleEndpoints
{
    public static void MapConsoleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/console")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/badges", GetBadges)
            .WithName("GetConsoleBadges")
            .WithSummary("Conteos para los badges de la consola de plataforma (SuperAdmin)");
    }

    private static async Task<IResult> GetBadges(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var support = await db.TicketsSoporte
            .IgnoreQueryFilters()
            .CountAsync(t => t.EliminadoEn == null
                && (t.Estado == EstadoTicket.Abierto || t.Estado == EstadoTicket.Pendiente));

        var dunning = await db.CobranzasSuscripcion
            .IgnoreQueryFilters()
            .CountAsync(c => c.EliminadoEn == null && c.Estado == EstadoCobranza.Activo);

        var crashReports = await db.CrashReports
            .CountAsync(c => !c.Resuelto);

        return Results.Ok(new { support, dunning, crashReports });
    }
}
