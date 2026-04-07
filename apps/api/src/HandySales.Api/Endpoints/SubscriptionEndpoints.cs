using HandySales.Api.Payments;
using HandySales.Application.SubscriptionPlans.Interfaces;
using HandySales.Domain.Entities;
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
                p.MaxTimbresMes,
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

        // Look up the plan to get authoritative MaxUsuarios (tenant field can be stale)
        var plan = !string.IsNullOrEmpty(tenant.PlanTipo)
            ? await db.SubscriptionPlans.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Codigo == tenant.PlanTipo)
            : null;
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
        catch (Exception ex)
        {
            return Results.BadRequest(new { message = "No se pudo completar la operación de suscripción." });
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
        [FromServices] HandySalesDbContext db,
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
        [FromServices] HandySalesDbContext db,
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
        [FromServices] HandySalesDbContext db)
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
        [FromServices] HandySalesDbContext db,
        [FromServices] IConfiguration config)
    {
        if (!currentTenant.IsAdmin)
            return Results.Forbid();

        // Validate package
        var packages = new Dictionary<int, decimal> { { 25, 50m }, { 50, 85m }, { 100, 150m } };
        if (!packages.TryGetValue(request.Cantidad, out var precio))
            return Results.BadRequest(new { error = "Paquete no válido. Opciones: 25, 50, 100 timbres." });

        // Create purchase record
        var purchase = new TimbrePurchase
        {
            TenantId = currentTenant.TenantId,
            Cantidad = request.Cantidad,
            PrecioMxn = precio,
        };
        db.TimbrePurchases.Add(purchase);
        await db.SaveChangesAsync();

        // Create Stripe Checkout Session
        var stripeKey = config["Stripe:SecretKey"];
        if (string.IsNullOrEmpty(stripeKey))
            return Results.BadRequest(new { error = "Stripe no configurado." });

        Stripe.StripeConfiguration.ApiKey = stripeKey;
        var domain = config["App:FrontendUrl"] ?? "http://localhost:1083";

        var options = new Stripe.Checkout.SessionCreateOptions
        {
            Mode = "payment",
            LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
            {
                new()
                {
                    PriceData = new Stripe.Checkout.SessionLineItemPriceDataOptions
                    {
                        Currency = "mxn",
                        UnitAmount = (long)(precio * 100),
                        ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Timbres CFDI x{request.Cantidad}",
                            Description = $"Paquete de {request.Cantidad} timbres para facturación electrónica",
                        },
                    },
                    Quantity = 1,
                },
            },
            Metadata = new Dictionary<string, string>
            {
                ["type"] = "timbre_purchase",
                ["tenantId"] = currentTenant.TenantId.ToString(),
                ["purchaseId"] = purchase.Id.ToString(),
            },
            SuccessUrl = $"{domain}/subscription?success=timbres",
            CancelUrl = $"{domain}/subscription/buy-timbres",
        };

        // Use existing Stripe customer if available
        var tenant = await db.Tenants.FindAsync(currentTenant.TenantId);
        if (!string.IsNullOrEmpty(tenant?.StripeCustomerId))
            options.Customer = tenant.StripeCustomerId;

        var service = new Stripe.Checkout.SessionService();
        var session = await service.CreateAsync(options);

        purchase.StripeCheckoutSessionId = session.Id;
        await db.SaveChangesAsync();

        return Results.Ok(new { url = session.Url });
    }

    private static async Task<IResult> GetTimbrePurchases(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySalesDbContext db)
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
}

// DTOs
public record CheckoutRequest(string PlanCode, string Interval, string ReturnUrl);
public record PortalRequest(string ReturnUrl);
public record TimbreCheckoutRequest(int Cantidad);
