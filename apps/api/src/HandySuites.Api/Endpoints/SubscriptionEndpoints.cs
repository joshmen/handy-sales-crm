using HandySuites.Api.Payments;
using HandySuites.Application.SubscriptionPlans.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

public static class SubscriptionEndpoints
{
    public static void MapSubscriptionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/subscription")
            .RequireAuthorization()
            .RequireCors("HandySuitesPolicy");

        group.MapGet("/plans", GetPlans)
            .WithName("GetSubscriptionPlans")
            .WithSummary("Lista los planes de suscripción disponibles");

        group.MapGet("/current", GetCurrentSubscription)
            .WithName("GetCurrentSubscription")
            .WithSummary("Estado actual de la suscripción del tenant");

        group.MapPost("/checkout", CreateCheckout)
            .WithName("CreateCheckoutSession")
            .WithSummary("Crea una sesión de Stripe Checkout");

        group.MapPost("/trial-checkout", CreateTrialCheckout)
            .WithName("CreateTrialCheckoutSession")
            .WithSummary("Crea una sesión de Stripe Checkout para captura de tarjeta durante trial");

        group.MapPost("/portal", CreatePortal)
            .WithName("CreatePortalSession")
            .WithSummary("Crea una sesión del portal de pagos de Stripe");

        group.MapPost("/cancel", CancelSubscription)
            .WithName("CancelSubscription")
            .WithSummary("Programa la cancelación al final del período actual");

        group.MapPost("/reactivate", ReactivateSubscription)
            .WithName("ReactivateSubscription")
            .WithSummary("Revierte una cancelación programada");

        group.MapGet("/invoices", GetInvoices)
            .WithName("GetInvoices")
            .WithSummary("Lista las facturas/pagos del tenant desde Stripe");

        group.MapGet("/payment-methods", GetPaymentMethods)
            .WithName("GetPaymentMethods")
            .WithSummary("Lista los métodos de pago del tenant");

        group.MapPost("/setup-intent", CreateSetupIntent)
            .WithName("CreateSetupIntent")
            .WithSummary("Crea un SetupIntent para actualizar tarjeta inline");

        group.MapGet("/timbres", GetTimbres)
            .WithName("GetTimbres")
            .WithSummary("Saldo de timbres CFDI del tenant (usados/máximo)");
group.MapPost("/timbres/registrar", RegistrarTimbreUsado)            .WithName("RegistrarTimbreUsado")            .WithSummary("Registra el uso de un timbre CFDI (llamado por Billing API tras timbrado exitoso)");

        group.MapPost("/timbres/checkout", CreateTimbreCheckout)
            .WithName("CreateTimbreCheckout")
            .WithSummary("Crea una sesión de Stripe Checkout para comprar timbres extras");

        group.MapGet("/timbres/purchases", GetTimbrePurchases)
            .WithName("GetTimbrePurchases")
            .WithSummary("Historial de compras de timbres del tenant");

        group.MapGet("/timbre-packages", GetTimbrePackages)
            .WithName("GetTimbrePackages")
            .WithSummary("Catálogo de paquetes de timbres disponibles para compra");
    }

    private static async Task<IResult> GetPlans(
        [FromServices] HandySuitesDbContext db)
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
                p.MaxTimbresMes,
                p.Orden
            })
            .ToListAsync();

        return Results.Ok(plans);
    }

    private static async Task<IResult> GetCurrentSubscription(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        var tenant = await db.Tenants
            .AsNoTracking()
            .Include(t => t.SubscriptionPlan)
            .FirstOrDefaultAsync(t => t.Id == currentTenant.TenantId);

        if (tenant == null)
            return Results.NotFound(new { message = "Tenant no encontrado" });

        // Use FK navigation; fall back to string lookup for legacy data
        var plan = tenant.SubscriptionPlan
            ?? (!string.IsNullOrEmpty(tenant.PlanTipo)
                ? await db.SubscriptionPlans.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Codigo == tenant.PlanTipo)
                : null);
        var maxUsuarios = plan?.MaxUsuarios ?? tenant.MaxUsuarios;

        // Sync tenant if stale (fire-and-forget safe: same DbContext, same request)
        if (plan != null && tenant.MaxUsuarios != plan.MaxUsuarios)
        {
            var tenantToUpdate = await db.Tenants.FindAsync(tenant.Id);
            if (tenantToUpdate != null)
            {
                tenantToUpdate.MaxUsuarios = plan.MaxUsuarios;
                await db.SaveChangesAsync();
            }
        }

        var activeUsers = await db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(u => u.TenantId == tenant.Id && u.Activo && u.EliminadoEn == null);

        var activeProductos = await db.Productos
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(p => p.TenantId == tenant.Id && p.Activo && p.EliminadoEn == null);

        var activeClientes = await db.Clientes
            .IgnoreQueryFilters()
            .AsNoTracking()
            .CountAsync(c => c.TenantId == tenant.Id && c.Activo && c.EliminadoEn == null);

        return Results.Ok(new
        {
            planTipo = tenant.PlanTipo,
            subscriptionStatus = tenant.SubscriptionStatus,
            maxUsuarios,
            activeUsuarios = activeUsers,
            activeProductos,
            activeClientes,
            fechaSuscripcion = tenant.FechaSuscripcion,
            fechaExpiracion = tenant.FechaExpiracion,
            gracePeriodEnd = tenant.GracePeriodEnd,
            cancelledAt = tenant.CancelledAt,
            cancellationScheduledFor = tenant.CancellationScheduledFor,
            hasStripe = !string.IsNullOrEmpty(tenant.StripeCustomerId),
            nombreEmpresa = tenant.NombreEmpresa,
            trialEndsAt = tenant.TrialEndsAt,
            trialCardCollected = tenant.TrialCardCollectedAt != null,
            daysRemaining = tenant.TrialEndsAt.HasValue
                ? Math.Max(0, (int)(tenant.TrialEndsAt.Value - DateTime.UtcNow).TotalDays)
                : (int?)null,
            timbresUsados = tenant.TimbresUsadosMes,
            timbresResetFecha = tenant.TimbresResetFecha
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
            var (clientSecret, sessionId) = await stripeService.CreateCheckoutSessionAsync(
                currentTenant.TenantId,
                dto.PlanCode,
                dto.Interval,
                dto.ReturnUrl);

            return Results.Ok(new { clientSecret, sessionId });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> CreatePortal(
        [FromBody] PortalRequest dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db,
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
            return Results.BadRequest(new { message = "No se pudo completar la operación de suscripción." });
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
            return Results.Ok(new { message = "Cancelación programada al final del período actual" });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> ReactivateSubscription(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IStripeService stripeService)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        try
        {
            await stripeService.ReactivateSubscriptionAsync(currentTenant.TenantId);
            return Results.Ok(new { message = "Suscripción reactivada" });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> CreateTrialCheckout(
        [FromBody] CheckoutRequest dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] IStripeService stripeService)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        try
        {
            var (clientSecret, sessionId) = await stripeService.CreateTrialCheckoutSessionAsync(
                currentTenant.TenantId,
                dto.PlanCode,
                dto.Interval,
                dto.ReturnUrl);

            return Results.Ok(new { clientSecret, sessionId });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { message = ex.Message });
        }
    }

    private static async Task<IResult> GetInvoices(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db,
        [FromServices] IStripeService stripeService)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenant = await db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == currentTenant.TenantId);

        if (tenant == null || string.IsNullOrEmpty(tenant.StripeCustomerId))
            return Results.Ok(Array.Empty<object>());

        try
        {
            var invoices = await stripeService.GetInvoicesAsync(tenant.StripeCustomerId);
            return Results.Ok(invoices);
        }
        catch (Exception)
        {
            return Results.Ok(Array.Empty<object>());
        }
    }

    private static async Task<IResult> GetPaymentMethods(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db,
        [FromServices] IStripeService stripeService)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenant = await db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == currentTenant.TenantId);

        if (tenant == null || string.IsNullOrEmpty(tenant.StripeCustomerId))
            return Results.Ok(Array.Empty<object>());

        try
        {
            var methods = await stripeService.GetPaymentMethodsAsync(tenant.StripeCustomerId);
            return Results.Ok(methods);
        }
        catch (Exception)
        {
            return Results.Ok(Array.Empty<object>());
        }
    }

    private static async Task<IResult> CreateSetupIntent(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db,
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
            var clientSecret = await stripeService.CreateSetupIntentAsync(tenant.StripeCustomerId);
            return Results.Ok(new { clientSecret });
        }
        catch (Exception)
        {
            return Results.BadRequest(new { message = "Error al crear sesión de actualización de tarjeta" });
        }
    }

    private static async Task<IResult> GetTimbres(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISubscriptionEnforcementService enforcement,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var result = await enforcement.CanUsarTimbreAsync(currentTenant.TenantId);
        var tenant = await db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == currentTenant.TenantId);

        return Results.Ok(new
        {
            usados = result.Current ?? 0,
            maximo = result.Limit ?? 0,
            disponibles = Math.Max(0, (result.Limit ?? 0) - (result.Current ?? 0)),
            extras = tenant?.TimbresExtras ?? 0,
            allowed = result.Allowed,
            message = result.Message
        });
    }

    private static async Task<IResult> RegistrarTimbreUsado(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ISubscriptionEnforcementService enforcement)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        await enforcement.RegistrarTimbreUsadoAsync(currentTenant.TenantId);
        return Results.Ok(new { registered = true });
    }

    private static async Task<IResult> CreateTimbreCheckout(
        [FromBody] TimbreCheckoutRequest request,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db,
        [FromServices] IConfiguration config)
    {
        if (!currentTenant.IsAdmin)
            return Results.Forbid();

        // Validate package from DB
        var pkg = await db.TimbrePackages.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.TimbrePackageId && p.Activo);
        if (pkg == null)
            return Results.BadRequest(new { error = "Paquete no válido." });
        if (string.IsNullOrEmpty(pkg.StripePriceId))
            return Results.BadRequest(new { error = "Stripe Price ID no configurado para este paquete." });

        // Validate tenant has billing-enabled plan
        var tenant2 = await db.Tenants.AsNoTracking()
            .Include(t => t.SubscriptionPlan)
            .FirstOrDefaultAsync(t => t.Id == currentTenant.TenantId);
        var plan = tenant2?.SubscriptionPlan;
        if (plan == null || !plan.IncluyeFacturacion)
            return Results.BadRequest(new { error = "Tu plan no incluye facturación." });

        // Create purchase record
        var purchase = new TimbrePurchase
        {
            TenantId = currentTenant.TenantId,
            Cantidad = pkg.Cantidad,
            PrecioMxn = pkg.PrecioMxn,
            TimbrePackageId = pkg.Id,
        };
        db.TimbrePurchases.Add(purchase);
        await db.SaveChangesAsync();

        // Create Stripe Checkout Session
        var stripeKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (string.IsNullOrEmpty(stripeKey))
            return Results.BadRequest(new { error = "Stripe no configurado." });

        Stripe.StripeConfiguration.ApiKey = stripeKey;
        var domain = config["App:FrontendUrl"] ?? "http://localhost:1083";

        var options = new Stripe.Checkout.SessionCreateOptions
        {
            UiMode = "embedded",
            Mode = "payment",
            LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
            {
                new() { Price = pkg.StripePriceId, Quantity = 1 },
            },
            Metadata = new Dictionary<string, string>
            {
                ["type"] = "timbre_purchase",
                ["tenant_id"] = currentTenant.TenantId.ToString(),
                ["purchaseId"] = purchase.Id.ToString(),
            },
            ReturnUrl = $"{domain}/subscription?success=timbres",
        };

        // Use existing Stripe customer if available
        var tenant = await db.Tenants.FindAsync(currentTenant.TenantId);
        if (!string.IsNullOrEmpty(tenant?.StripeCustomerId))
            options.Customer = tenant.StripeCustomerId;

        var service = new Stripe.Checkout.SessionService();
        var session = await service.CreateAsync(options);

        purchase.StripeCheckoutSessionId = session.Id;
        await db.SaveChangesAsync();

        return Results.Ok(new { clientSecret = session.ClientSecret });
    }

    private static async Task<IResult> GetTimbrePurchases(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySuitesDbContext db)
    {
        if (!currentTenant.IsAdmin)
            return Results.Forbid();

        var purchases = await db.TimbrePurchases
            .Where(p => p.TenantId == currentTenant.TenantId)
            .OrderByDescending(p => p.CreadoEn)
            .Take(20)
            .Select(p => new { p.Id, p.Cantidad, p.PrecioMxn, p.Estado, p.CreadoEn, p.CompletadoEn })
            .ToListAsync();

        return Results.Ok(purchases);
    }

    private static async Task<IResult> GetTimbrePackages(
        [FromServices] HandySuitesDbContext db)
    {
        var packages = await db.TimbrePackages
            .AsNoTracking()
            .Where(p => p.Activo)
            .OrderBy(p => p.Orden)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Cantidad,
                precioMxn = p.PrecioMxn,
                precioUnitario = p.PrecioUnitario,
                p.Badge,
                p.Orden,
            })
            .ToListAsync();

        return Results.Ok(packages);
    }
}

// DTOs
public record CheckoutRequest(string PlanCode, string Interval, string ReturnUrl);
public record PortalRequest(string ReturnUrl);
public record TimbreCheckoutRequest(int TimbrePackageId);
