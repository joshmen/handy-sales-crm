using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Stripe;
using Stripe.Checkout;

namespace HandySales.Api.Payments;

public interface IStripeService
{
    Task<string> CreateCustomerAsync(Tenant tenant);
    Task<(string ClientSecret, string SessionId)> CreateCheckoutSessionAsync(int tenantId, string planCode, string interval, string returnUrl);
    Task<(string ClientSecret, string SessionId)> CreateTrialCheckoutSessionAsync(int tenantId, string planCode, string interval, string returnUrl);
    Task<string> CreatePortalSessionAsync(string stripeCustomerId, string returnUrl);
    Task HandleWebhookAsync(string json, string signature);
    Task CancelSubscriptionAsync(int tenantId);
    Task ReactivateSubscriptionAsync(int tenantId);
    Task<List<InvoiceDto>> GetInvoicesAsync(string stripeCustomerId, int limit = 24);
    Task<List<PaymentMethodDto>> GetPaymentMethodsAsync(string stripeCustomerId);
    Task<string> CreateSetupIntentAsync(string stripeCustomerId);
}

public record InvoiceDto(
    string Id,
    string? Number,
    DateTime Created,
    DateTime PeriodStart,
    DateTime PeriodEnd,
    string Status,
    long AmountPaid,
    long AmountDue,
    string Currency,
    string? InvoicePdfUrl,
    string? HostedInvoiceUrl
);

public record PaymentMethodDto(
    string Id,
    string Type,
    string? CardBrand,
    string? CardLast4,
    int? CardExpMonth,
    int? CardExpYear,
    bool IsDefault
);

public class StripeService : IStripeService
{
    private readonly HandySalesDbContext _db;
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<StripeService> _logger;
    private readonly string _webhookSecret;

    public StripeService(
        HandySalesDbContext db,
        IEmailService emailService,
        IMemoryCache cache,
        ILogger<StripeService> logger)
    {
        _db = db;
        _emailService = emailService;
        _cache = cache;
        _logger = logger;

        var secretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (!string.IsNullOrEmpty(secretKey))
        {
            StripeConfiguration.ApiKey = secretKey;
        }
        else
        {
            _logger.LogWarning("STRIPE_SECRET_KEY not configured — Stripe operations will fail");
        }

        _webhookSecret = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET") ?? "";
    }

    public async Task<string> CreateCustomerAsync(Tenant tenant)
    {
        // Obtener email de DatosEmpresa (ya no está en Tenant)
        var datosEmpresa = await _db.DatosEmpresa
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.TenantId == tenant.Id);

        var options = new CustomerCreateOptions
        {
            Email = datosEmpresa?.Email,
            Name = tenant.NombreEmpresa,
            Metadata = new Dictionary<string, string>
            {
                { "tenant_id", tenant.Id.ToString() }
            }
        };

        var service = new CustomerService();
        var customer = await service.CreateAsync(options);

        tenant.StripeCustomerId = customer.Id;
        await _db.SaveChangesAsync();

        return customer.Id;
    }

    public async Task<(string ClientSecret, string SessionId)> CreateCheckoutSessionAsync(
        int tenantId, string planCode, string interval,
        string returnUrl)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId)
            ?? throw new InvalidOperationException("Tenant no encontrado");

        // Ensure Stripe customer exists
        if (string.IsNullOrEmpty(tenant.StripeCustomerId))
        {
            await CreateCustomerAsync(tenant);
        }

        // Find the target plan
        var plan = await _db.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Codigo == planCode && p.Activo)
            ?? throw new InvalidOperationException($"Plan '{planCode}' no encontrado");

        // Downgrade validation: check if tenant exceeds target plan limits
        var currentPlanCode = NormalizePlanCode(tenant.PlanTipo);
        var currentPlan = currentPlanCode != "FREE"
            ? await _db.SubscriptionPlans.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Codigo == currentPlanCode && p.Activo)
            : null;

        if (currentPlan != null && plan.Orden < currentPlan.Orden)
        {
            // This is a downgrade — validate limits
            var activeUsers = await _db.Usuarios.IgnoreQueryFilters().AsNoTracking()
                .CountAsync(u => u.TenantId == tenantId && u.Activo);
            var activeProducts = await _db.Productos.IgnoreQueryFilters().AsNoTracking()
                .CountAsync(p => p.TenantId == tenantId && p.Activo);
            var activeClients = await _db.Clientes.IgnoreQueryFilters().AsNoTracking()
                .CountAsync(c => c.TenantId == tenantId && c.Activo);

            var violations = new List<string>();
            if (activeUsers > plan.MaxUsuarios)
                violations.Add($"usuarios ({activeUsers}/{plan.MaxUsuarios})");
            if (activeProducts > plan.MaxProductos)
                violations.Add($"productos ({activeProducts}/{plan.MaxProductos})");
            if (activeClients > plan.MaxClientesPorMes)
                violations.Add($"clientes ({activeClients}/{plan.MaxClientesPorMes})");

            if (violations.Count > 0)
                throw new InvalidOperationException(
                    $"No puedes bajar al plan {plan.Nombre}. Excedes los límites de: {string.Join(", ", violations)}. Desactiva registros antes de cambiar.");
        }

        // Block FREE plan for tenants that have had paid subscriptions
        if (planCode == "FREE" && !string.IsNullOrEmpty(tenant.StripeCustomerId))
            throw new InvalidOperationException("El plan gratuito no está disponible para cuentas con historial de pago.");

        var priceId = interval == "year" ? plan.StripePriceIdAnual : plan.StripePriceIdMensual;
        if (string.IsNullOrEmpty(priceId))
            throw new InvalidOperationException($"Stripe Price ID no configurado para plan {planCode} ({interval})");

        var options = new SessionCreateOptions
        {
            Customer = tenant.StripeCustomerId,
            UiMode = "embedded",
            Mode = "subscription",
            LineItems = new List<SessionLineItemOptions>
            {
                new() { Price = priceId, Quantity = 1 }
            },
            ReturnUrl = returnUrl + "?session_id={CHECKOUT_SESSION_ID}",
            Metadata = new Dictionary<string, string>
            {
                { "tenant_id", tenantId.ToString() },
                { "plan_code", planCode }
            }
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        return (session.ClientSecret, session.Id);
    }

    public async Task<(string ClientSecret, string SessionId)> CreateTrialCheckoutSessionAsync(
        int tenantId, string planCode, string interval, string returnUrl)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId)
            ?? throw new InvalidOperationException("Tenant no encontrado");

        if (tenant.TrialEndsAt == null)
            throw new InvalidOperationException("Tenant no está en periodo de prueba");

        // Ensure Stripe customer exists
        if (string.IsNullOrEmpty(tenant.StripeCustomerId))
            await CreateCustomerAsync(tenant);

        var plan = await _db.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Codigo == planCode && p.Activo)
            ?? throw new InvalidOperationException($"Plan '{planCode}' no encontrado");

        var priceId = interval == "year" ? plan.StripePriceIdAnual : plan.StripePriceIdMensual;
        if (string.IsNullOrEmpty(priceId))
            throw new InvalidOperationException($"Stripe Price ID no configurado para plan {planCode} ({interval})");

        var options = new SessionCreateOptions
        {
            Customer = tenant.StripeCustomerId,
            UiMode = "embedded",
            Mode = "subscription",
            LineItems = new List<SessionLineItemOptions>
            {
                new() { Price = priceId, Quantity = 1 }
            },
            SubscriptionData = new SessionSubscriptionDataOptions
            {
                TrialEnd = tenant.TrialEndsAt.Value,
            },
            ReturnUrl = returnUrl + "?session_id={CHECKOUT_SESSION_ID}",
            Metadata = new Dictionary<string, string>
            {
                { "tenant_id", tenantId.ToString() },
                { "plan_code", planCode },
                { "is_trial_checkout", "true" }
            }
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        return (session.ClientSecret, session.Id);
    }

    public async Task<string> CreatePortalSessionAsync(string stripeCustomerId, string returnUrl)
    {
        var options = new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = stripeCustomerId,
            ReturnUrl = returnUrl
        };

        var service = new Stripe.BillingPortal.SessionService();
        var session = await service.CreateAsync(options);

        return session.Url;
    }

    public async Task HandleWebhookAsync(string json, string signature)
    {
        var stripeEvent = EventUtility.ConstructEvent(json, signature, _webhookSecret, throwOnApiVersionMismatch: false);

        _logger.LogInformation("Stripe webhook received: {Type}", stripeEvent.Type);

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                await HandleCheckoutCompleted(stripeEvent);
                break;

            case "invoice.paid":
                await HandleInvoicePaid(stripeEvent);
                break;

            case "invoice.payment_failed":
                await HandlePaymentFailed(stripeEvent);
                break;

            case "customer.subscription.deleted":
                await HandleSubscriptionDeleted(stripeEvent);
                break;

            case "customer.subscription.updated":
                await HandleSubscriptionUpdated(stripeEvent);
                break;
        }
    }

    public async Task CancelSubscriptionAsync(int tenantId)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId)
            ?? throw new InvalidOperationException("Tenant no encontrado");

        if (string.IsNullOrEmpty(tenant.StripeSubscriptionId))
            throw new InvalidOperationException("No hay suscripción activa de Stripe");

        // Cancel at end of billing period (not immediately)
        var service = new SubscriptionService();
        var sub = await service.UpdateAsync(tenant.StripeSubscriptionId, new SubscriptionUpdateOptions
        {
            CancelAtPeriodEnd = true
        });

        tenant.CancellationScheduledFor = sub.CurrentPeriodEnd;
        await _db.SaveChangesAsync();

        // Send cancellation confirmation email
        var adminEmails = await _db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == tenant.Id && u.EsAdmin && u.Activo)
            .Select(u => u.Email)
            .ToListAsync();

        var emailBody = EmailTemplates.SubscriptionCancellationScheduled(
            tenant.NombreEmpresa, sub.CurrentPeriodEnd);
        await _emailService.SendBulkAsync(adminEmails!, "Cancelación programada - HandySales", emailBody);

        _logger.LogInformation("Subscription cancel scheduled for tenant {TenantId}, ends {EndDate}",
            tenantId, sub.CurrentPeriodEnd);
    }

    public async Task ReactivateSubscriptionAsync(int tenantId)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId)
            ?? throw new InvalidOperationException("Tenant no encontrado");

        if (string.IsNullOrEmpty(tenant.StripeSubscriptionId))
            throw new InvalidOperationException("No hay suscripción activa de Stripe");

        if (tenant.CancellationScheduledFor == null)
            throw new InvalidOperationException("La suscripción no está programada para cancelarse");

        // Revert cancel_at_period_end
        var service = new SubscriptionService();
        await service.UpdateAsync(tenant.StripeSubscriptionId, new SubscriptionUpdateOptions
        {
            CancelAtPeriodEnd = false
        });

        tenant.CancellationScheduledFor = null;
        await _db.SaveChangesAsync();

        // Send reactivation confirmation email
        var adminEmails = await _db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == tenant.Id && u.EsAdmin && u.Activo)
            .Select(u => u.Email)
            .ToListAsync();

        var emailBody = EmailTemplates.SubscriptionReactivated(tenant.NombreEmpresa);
        await _emailService.SendBulkAsync(adminEmails!, "Suscripción reactivada - HandySales", emailBody);

        _logger.LogInformation("Subscription reactivated for tenant {TenantId}", tenantId);
    }

    // --- Webhook Handlers ---

    private async Task HandleCheckoutCompleted(Event stripeEvent)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session?.Metadata == null || !session.Metadata.TryGetValue("tenant_id", out var tenantIdStr))
            return;

        if (!int.TryParse(tenantIdStr, out var tenantId)) return;

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null) return;

        session.Metadata.TryGetValue("plan_code", out var planCode);
        session.Metadata.TryGetValue("is_trial_checkout", out var isTrialCheckout);

        tenant.StripeSubscriptionId = session.Subscription?.ToString();
        tenant.PlanTipo = planCode ?? tenant.PlanTipo;
        tenant.Activo = true;
        tenant.CancelledAt = null;
        tenant.CancellationReason = null;
        tenant.CancellationScheduledFor = null;

        if (isTrialCheckout == "true")
        {
            // Trial card capture: keep Trial status, record card collection
            tenant.TrialCardCollectedAt = DateTime.UtcNow;
            // Don't change SubscriptionStatus — stays "Trial" until trial ends and Stripe charges
        }
        else
        {
            // Regular checkout: activate immediately
            tenant.SubscriptionStatus = "Active";
            tenant.FechaSuscripcion = DateTime.UtcNow;
            tenant.FechaExpiracion = DateTime.UtcNow.AddMonths(1); // Will be updated by invoice.paid
        }

        // Update max users from plan
        if (!string.IsNullOrEmpty(planCode))
        {
            var plan = await _db.SubscriptionPlans.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Codigo == planCode);
            if (plan != null)
                tenant.MaxUsuarios = plan.MaxUsuarios;
        }

        await _db.SaveChangesAsync();
        _cache.Remove($"tenant_active:{tenantId}");

        _logger.LogInformation("Checkout completed for tenant {TenantId}, plan: {Plan}", tenantId, planCode);
    }

    private async Task HandleInvoicePaid(Event stripeEvent)
    {
        var invoice = stripeEvent.Data.Object as Invoice;
        if (invoice?.Customer == null) return;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.StripeCustomerId == invoice.Customer.Id);
        if (tenant == null) return;

        // Extend subscription (also handles trial → paid conversion)
        tenant.SubscriptionStatus = "Active";
        tenant.FechaSuscripcion ??= DateTime.UtcNow;
        tenant.FechaExpiracion = invoice.PeriodEnd;
        tenant.GracePeriodEnd = null;
        tenant.Activo = true;

        await _db.SaveChangesAsync();
        _cache.Remove($"tenant_active:{tenant.Id}");

        // Send payment confirmation email
        var adminEmails = await _db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == tenant.Id && u.EsAdmin && u.Activo)
            .Select(u => u.Email)
            .ToListAsync();

        var emailBody = EmailTemplates.PaymentSuccessful(
            tenant.NombreEmpresa,
            tenant.PlanTipo ?? "Suscripción",
            (decimal)(invoice.AmountPaid / 100m));

        await _emailService.SendBulkAsync(adminEmails!, "Pago recibido - HandySales", emailBody);

        _logger.LogInformation("Invoice paid for tenant {TenantId}, amount: {Amount}", tenant.Id, invoice.AmountPaid);
    }

    private async Task HandlePaymentFailed(Event stripeEvent)
    {
        var invoice = stripeEvent.Data.Object as Invoice;
        if (invoice?.Customer == null) return;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.StripeCustomerId == invoice.Customer.Id);
        if (tenant == null) return;

        tenant.SubscriptionStatus = "PastDue";
        if (tenant.GracePeriodEnd == null)
            tenant.GracePeriodEnd = DateTime.UtcNow.AddDays(7);

        await _db.SaveChangesAsync();

        // Send payment failed email
        var adminEmails = await _db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == tenant.Id && u.EsAdmin && u.Activo)
            .Select(u => u.Email)
            .ToListAsync();

        var emailBody = EmailTemplates.PaymentFailed(tenant.NombreEmpresa, "");
        await _emailService.SendBulkAsync(adminEmails!, "Error en el pago - HandySales", emailBody);

        _logger.LogWarning("Payment failed for tenant {TenantId}", tenant.Id);
    }

    private async Task HandleSubscriptionDeleted(Event stripeEvent)
    {
        var subscription = stripeEvent.Data.Object as Subscription;
        if (subscription?.Customer == null) return;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.StripeCustomerId == subscription.Customer.Id);
        if (tenant == null) return;

        tenant.SubscriptionStatus = "Cancelled";
        tenant.CancelledAt = DateTime.UtcNow;
        tenant.StripeSubscriptionId = null;
        tenant.CancellationScheduledFor = null;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Subscription deleted for tenant {TenantId}", tenant.Id);
    }

    private async Task HandleSubscriptionUpdated(Event stripeEvent)
    {
        var subscription = stripeEvent.Data.Object as Subscription;
        if (subscription?.Customer == null) return;

        var tenant = await _db.Tenants
            .FirstOrDefaultAsync(t => t.StripeCustomerId == subscription.Customer.Id);
        if (tenant == null) return;

        tenant.StripeSubscriptionId = subscription.Id;

        // Track cancel_at_period_end state from Stripe
        if (subscription.CancelAtPeriodEnd)
        {
            tenant.CancellationScheduledFor = subscription.CurrentPeriodEnd;
        }
        else
        {
            // Reactivated (cancel_at_period_end reverted)
            tenant.CancellationScheduledFor = null;
        }

        if (subscription.Status == "active")
            tenant.SubscriptionStatus = "Active";
        else if (subscription.Status == "past_due")
            tenant.SubscriptionStatus = "PastDue";

        await _db.SaveChangesAsync();

        _logger.LogInformation("Subscription updated for tenant {TenantId}, status: {Status}, cancelAtPeriodEnd: {CancelAtPeriodEnd}",
            tenant.Id, subscription.Status, subscription.CancelAtPeriodEnd);
    }

    public async Task<List<InvoiceDto>> GetInvoicesAsync(string stripeCustomerId, int limit = 24)
    {
        var service = new InvoiceService();
        var options = new InvoiceListOptions
        {
            Customer = stripeCustomerId,
            Limit = limit,
        };

        var invoices = await service.ListAsync(options);

        return invoices.Data.Select(inv => new InvoiceDto(
            Id: inv.Id,
            Number: inv.Number,
            Created: inv.Created,
            PeriodStart: inv.PeriodStart,
            PeriodEnd: inv.PeriodEnd,
            Status: inv.Status ?? "unknown",
            AmountPaid: inv.AmountPaid,
            AmountDue: inv.AmountDue,
            Currency: inv.Currency ?? "mxn",
            InvoicePdfUrl: inv.InvoicePdf,
            HostedInvoiceUrl: inv.HostedInvoiceUrl
        )).ToList();
    }

    public async Task<List<PaymentMethodDto>> GetPaymentMethodsAsync(string stripeCustomerId)
    {
        // Get default payment method from customer
        var customerService = new CustomerService();
        var customer = await customerService.GetAsync(stripeCustomerId);
        var defaultPmId = customer.InvoiceSettings?.DefaultPaymentMethodId;

        var pmService = new PaymentMethodService();
        var options = new PaymentMethodListOptions
        {
            Customer = stripeCustomerId,
            Type = "card",
        };

        var methods = await pmService.ListAsync(options);

        return methods.Data.Select(pm => new PaymentMethodDto(
            Id: pm.Id,
            Type: pm.Type ?? "card",
            CardBrand: pm.Card?.Brand,
            CardLast4: pm.Card?.Last4,
            CardExpMonth: (int?)pm.Card?.ExpMonth,
            CardExpYear: (int?)pm.Card?.ExpYear,
            IsDefault: pm.Id == defaultPmId
        )).ToList();
    }

    public async Task<string> CreateSetupIntentAsync(string stripeCustomerId)
    {
        var options = new SetupIntentCreateOptions
        {
            Customer = stripeCustomerId,
            PaymentMethodTypes = new List<string> { "card" },
            Usage = "off_session",
        };

        var service = new SetupIntentService();
        var intent = await service.CreateAsync(options);

        return intent.ClientSecret;
    }

    /// <summary>Maps legacy plan codes (PROFESIONAL, BASICO, STARTER) to canonical codes (PRO, BASIC).</summary>
    private static string NormalizePlanCode(string? planTipo)
    {
        if (string.IsNullOrEmpty(planTipo)) return "FREE";
        return planTipo.ToUpperInvariant() switch
        {
            "TRIAL" => "FREE",
            "PROFESIONAL" or "PROFESSIONAL" => "PRO",
            "BASICO" or "STARTER" => "BASIC",
            _ => planTipo.ToUpperInvariant()
        };
    }
}
