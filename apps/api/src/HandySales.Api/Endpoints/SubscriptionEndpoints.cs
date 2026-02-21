using HandySales.Api.Payments;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Endpoints;

public static class SubscriptionEndpoints
{
    public static void MapSubscriptionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/subscription")
            .RequireAuthorization()
            .RequireCors("HandySalesPolicy");

        group.MapGet("/plans", GetPlans)
            .WithName("GetSubscriptionPlans")
            .WithSummary("Lista los planes de suscripción disponibles");

        group.MapGet("/current", GetCurrentSubscription)
            .WithName("GetCurrentSubscription")
            .WithSummary("Estado actual de la suscripción del tenant");

        group.MapPost("/checkout", CreateCheckout)
            .WithName("CreateCheckoutSession")
            .WithSummary("Crea una sesión de Stripe Checkout");

        group.MapPost("/portal", CreatePortal)
            .WithName("CreatePortalSession")
            .WithSummary("Crea una sesión del portal de pagos de Stripe");

        group.MapPost("/cancel", CancelSubscription)
            .WithName("CancelSubscription")
            .WithSummary("Cancela la suscripción activa");
    }

    private static async Task<IResult> GetPlans(
        [FromServices] HandySalesDbContext db)
    {
        var plans = await db.SubscriptionPlans
            .AsNoTracking()
            .Where(p => p.Activo)
            .OrderBy(p => p.Orden)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Codigo,
                p.PrecioMensual,
                p.PrecioAnual,
                p.MaxUsuarios,
                p.MaxProductos,
                p.MaxClientesPorMes,
                p.IncluyeReportes,
                p.IncluyeSoportePrioritario,
                p.Orden
            })
            .ToListAsync();

        return Results.Ok(plans);
    }

    private static async Task<IResult> GetCurrentSubscription(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySalesDbContext db)
    {
        var tenant = await db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == currentTenant.TenantId);

        if (tenant == null)
            return Results.NotFound(new { message = "Tenant no encontrado" });

        var activeUsers = await db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(u => u.TenantId == tenant.Id && u.Activo);

        return Results.Ok(new
        {
            planTipo = tenant.PlanTipo,
            subscriptionStatus = tenant.SubscriptionStatus,
            maxUsuarios = tenant.MaxUsuarios,
            activeUsuarios = activeUsers,
            fechaSuscripcion = tenant.FechaSuscripcion,
            fechaExpiracion = tenant.FechaExpiracion,
            gracePeriodEnd = tenant.GracePeriodEnd,
            cancelledAt = tenant.CancelledAt,
            hasStripe = !string.IsNullOrEmpty(tenant.StripeCustomerId),
            nombreEmpresa = tenant.NombreEmpresa
        });
    }

    private static async Task<IResult> CreateCheckout(
        [FromBody] CheckoutRequest dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IStripeService stripeService)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        try
        {
            var url = await stripeService.CreateCheckoutSessionAsync(
                currentTenant.TenantId,
                dto.PlanCode,
                dto.Interval,
                dto.SuccessUrl,
                dto.CancelUrl);

            return Results.Ok(new { url });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> CreatePortal(
        [FromBody] PortalRequest dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySalesDbContext db,
        [FromServices] IStripeService stripeService)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenant = await db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == currentTenant.TenantId);

        if (tenant == null || string.IsNullOrEmpty(tenant.StripeCustomerId))
            return Results.BadRequest(new { message = "No hay cuenta de Stripe configurada" });

        try
        {
            var url = await stripeService.CreatePortalSessionAsync(
                tenant.StripeCustomerId, dto.ReturnUrl);

            return Results.Ok(new { url });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> CancelSubscription(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IStripeService stripeService)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        try
        {
            await stripeService.CancelSubscriptionAsync(currentTenant.TenantId);
            return Results.Ok(new { message = "Suscripción cancelada" });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }
}

// DTOs
public record CheckoutRequest(string PlanCode, string Interval, string SuccessUrl, string CancelUrl);
public record PortalRequest(string ReturnUrl);
