using HandySuites.Application.Analytics.DTOs;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// SaaS-level analytics for SuperAdmin: aggregates derived over Tenant +
/// SubscriptionPlan (MRR, ARR, churn, conversion, funnel, cohorts, MRR movement).
/// Read-only, cross-tenant. Separate from the tenant-scoped custom analytics
/// in <see cref="AnalyticsEndpoints"/> (/api/analytics).
/// </summary>
public static class SaasAnalyticsEndpoints
{
    public static void MapSaasAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/analytics")
            .RequireAuthorization(policy => policy.RequireRole("SUPER_ADMIN"))
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/", GetAnalytics)
            .WithName("GetSaasAnalytics")
            .WithSummary("Métricas SaaS agregadas: MRR, ARR, churn, conversión, embudo, cohortes (SuperAdmin)");
    }

    private static async Task<IResult> GetAnalytics(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStart = monthStart.AddMonths(1);

        // Tenants vivos (sin soft-delete), cross-tenant para SuperAdmin.
        var tenants = await db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.EliminadoEn == null)
            .Select(t => new TenantSnapshot
            {
                Id = t.Id,
                SubscriptionStatus = t.SubscriptionStatus,
                PlanTipo = t.PlanTipo,
                PrecioMensual = t.SubscriptionPlan != null ? t.SubscriptionPlan.PrecioMensual : 0m,
                CreadoEn = t.CreadoEn,
                CancelledAt = t.CancelledAt,
                TrialEndsAt = t.TrialEndsAt,
                TrialCardCollectedAt = t.TrialCardCollectedAt
            })
            .ToListAsync();

        bool IsActive(TenantSnapshot t) =>
            string.Equals(t.SubscriptionStatus, "Active", StringComparison.OrdinalIgnoreCase);

        bool CancelledThisMonth(TenantSnapshot t) =>
            t.CancelledAt.HasValue &&
            t.CancelledAt.Value >= monthStart &&
            t.CancelledAt.Value < nextMonthStart;

        // Activo al inicio del mes: creado antes del inicio del mes y hoy activo
        // o cancelado dentro de este mes (estaba vivo cuando arrancó el mes).
        bool ActiveAtMonthStart(TenantSnapshot t) =>
            t.CreadoEn < monthStart && (IsActive(t) || CancelledThisMonth(t));

        // MRR / ARR: suma del precio mensual de los tenants activos.
        var activos = tenants.Where(IsActive).ToList();
        var mrr = activos.Sum(t => t.PrecioMensual);
        var arr = mrr * 12m;

        // Churn = cancelados en el mes actual / activos al inicio del mes (o 0).
        var canceladosMes = tenants.Count(CancelledThisMonth);
        var activosInicioMes = tenants.Count(ActiveAtMonthStart);
        var churn = activosInicioMes > 0
            ? Math.Round((decimal)canceladosMes / activosInicioMes, 4)
            : 0m;

        // Conversión = trials con tarjeta recolectada que están Active /
        // total que tuvieron trial (TrialCardCollectedAt != null).
        var tuvieronTrial = tenants.Count(t => t.TrialCardCollectedAt != null);
        var convirtieron = tenants.Count(t => t.TrialCardCollectedAt != null && IsActive(t));
        var conversion = tuvieronTrial > 0
            ? Math.Round((decimal)convirtieron / tuvieronTrial, 4)
            : 0m;

        // Embudo.
        var embudo = new EmbudoDto
        {
            Pruebas = tenants.Count(t =>
                t.TrialEndsAt != null ||
                string.Equals(t.SubscriptionStatus, "Trial", StringComparison.OrdinalIgnoreCase)),
            Activaron = tenants.Count(t => t.TrialCardCollectedAt != null),
            Pago = tenants.Count(IsActive),
            Retenidas = tenants.Count(t => IsActive(t) && t.CancelledAt == null)
        };

        // Churn por plan: cancelados este mes / activos inicio de mes, por plan.
        var churnPorPlan = tenants
            .Where(t => !string.IsNullOrEmpty(t.PlanTipo))
            .GroupBy(t => t.PlanTipo!)
            .Select(g =>
            {
                var baseMes = g.Count(ActiveAtMonthStart);
                var cancel = g.Count(CancelledThisMonth);
                return new ChurnPorPlanDto
                {
                    Plan = g.Key,
                    Churn = baseMes > 0 ? Math.Round((decimal)cancel / baseMes, 4) : 0m
                };
            })
            .OrderBy(c => c.Plan)
            .ToList();

        // Cohortes: últimos 6 meses por mes de CreadoEn.
        var cohortes = new List<CohorteDto>();
        for (var i = 5; i >= 0; i--)
        {
            var cohorteStart = monthStart.AddMonths(-i);
            var cohorteEnd = cohorteStart.AddMonths(1);
            var cohorte = tenants
                .Where(t => t.CreadoEn >= cohorteStart && t.CreadoEn < cohorteEnd)
                .ToList();
            var totalInicial = cohorte.Count;
            var activosCohorte = cohorte.Count(IsActive);
            cohortes.Add(new CohorteDto
            {
                Mes = cohorteStart.ToString("yyyy-MM"),
                TotalInicial = totalInicial,
                PorcentajeActivo = totalInicial > 0
                    ? Math.Round((decimal)activosCohorte / totalInicial, 4)
                    : 0m
            });
        }

        // ARPA = MRR / # activos. LTV = ARPA / churn (si churn > 0, si no null).
        var arpa = activos.Count > 0 ? mrr / activos.Count : 0m;
        decimal? ltv = churn > 0 ? Math.Round(arpa / churn, 2) : (decimal?)null;

        // Movimiento de MRR.
        var nuevas = tenants.Count(t =>
            t.CreadoEn >= monthStart && t.CreadoEn < nextMonthStart);
        var churnMrr = tenants
            .Where(CancelledThisMonth)
            .Sum(t => t.PrecioMensual);

        var movimientoMrr = new MovimientoMrrDto
        {
            Nuevas = nuevas,
            Expansion = null,   // Sin datos
            Contraccion = null, // Sin datos
            Churn = churnMrr,
            Final = mrr
        };

        var dto = new AnaliticaDto
        {
            Mrr = mrr,
            Arr = arr,
            Churn = churn,
            Conversion = conversion,
            Embudo = embudo,
            ChurnPorPlan = churnPorPlan,
            Cohortes = cohortes,
            Ltv = ltv,
            Cac = null, // Sin datos
            MovimientoMrr = movimientoMrr
        };

        return Results.Ok(dto);
    }

    private sealed class TenantSnapshot
    {
        public int Id { get; set; }
        public string SubscriptionStatus { get; set; } = string.Empty;
        public string? PlanTipo { get; set; }
        public decimal PrecioMensual { get; set; }
        public DateTime CreadoEn { get; set; }
        public DateTime? CancelledAt { get; set; }
        public DateTime? TrialEndsAt { get; set; }
        public DateTime? TrialCardCollectedAt { get; set; }
    }
}
