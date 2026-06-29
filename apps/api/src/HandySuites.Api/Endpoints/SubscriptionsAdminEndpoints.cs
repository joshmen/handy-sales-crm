using HandySuites.Application.Subscriptions.DTOs;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

public static class SubscriptionsAdminEndpoints
{
    public static void MapSubscriptionsAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/subscriptions")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/", GetResumen)
            .WithName("GetSubscripcionesResumen")
            .WithSummary("Resumen de suscripciones, MRR/ARR y renovaciones (SuperAdmin)");
    }

    private static async Task<IResult> GetResumen(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenants = await db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.EliminadoEn == null)
            .Select(t => new
            {
                t.NombreEmpresa,
                t.SubscriptionPlanId,
                t.StripePriceId,
                t.SubscriptionStatus,
                t.FechaExpiracion
            })
            .ToListAsync();

        var planes = await db.SubscriptionPlans
            .AsNoTracking()
            .ToListAsync();

        var planesById = planes.ToDictionary(p => p.Id);

        var hoy = DateTime.UtcNow.Date;
        var limiteRenovacion = hoy.AddDays(7);

        var items = new List<SubscripcionDto>();
        decimal mrrTotal = 0m;
        var activas = 0;

        foreach (var t in tenants)
        {
            if (t.SubscriptionStatus != "Active" || t.SubscriptionPlanId == null)
                continue;

            if (!planesById.TryGetValue(t.SubscriptionPlanId.Value, out var plan))
                continue;

            activas++;

            var esAnual = plan.StripePriceIdAnual != null
                && t.StripePriceId == plan.StripePriceIdAnual;

            var ciclo = esAnual ? "Anual" : "Mensual";
            var mrr = esAnual ? plan.PrecioAnual / 12 : plan.PrecioMensual;
            mrrTotal += mrr;

            items.Add(new SubscripcionDto
            {
                Empresa = t.NombreEmpresa,
                Plan = plan.Nombre,
                Mrr = mrr,
                Ciclo = ciclo,
                ProximaRenovacion = t.FechaExpiracion,
                Metodo = "Sin datos",
                Estado = t.SubscriptionStatus
            });
        }

        var renovaciones7d = tenants.Count(t =>
            t.FechaExpiracion != null
            && t.FechaExpiracion.Value.Date >= hoy
            && t.FechaExpiracion.Value.Date <= limiteRenovacion);

        var resumen = new SubscripcionesResumenDto
        {
            Items = items,
            Mrr = mrrTotal,
            Arr = mrrTotal * 12,
            Activas = activas,
            Renovaciones7d = renovaciones7d
        };

        return Results.Ok(resumen);
    }
}
