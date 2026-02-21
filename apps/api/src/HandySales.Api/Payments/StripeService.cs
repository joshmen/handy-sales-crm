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
    Task<string> CreateCheckoutSessionAsync(int tenantId, string planCode, string interval, string successUrl, string cancelUrl);
    Task<string> CreatePortalSessionAsync(string stripeCustomerId, string returnUrl);
    Task HandleWebhookAsync(string json, string signature);
    Task CancelSubscriptionAsync(int tenantId);
}

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

    public async Task<string> CreateCheckoutSessionAsync(
        int tenantId, string planCode, string interval,
        string successUrl, string cancelUrl)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId)
            ?? throw new InvalidOperationException("Tenant no encontrado");

        // Ensure Stripe customer exists
        if (string.IsNullOrEmpty(tenant.StripeCustomerId))
        {
            await CreateCustomerAsync(tenant);
        }

        // Find the plan
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
            Mode = "subscription",
            LineItems = new List<SessionLineItemOptions>
            {
                new() { Price = priceId, Quantity = 1 }
            },
            SuccessUrl = successUrl + "?session_id={CHECKOUT_SESSION_ID}",
            CancelUrl = cancelUrl,
            Metadata = new Dictionary<string, string>
            {
                { "tenant_id", tenantId.ToString() },
                { "plan_code", planCode }
            }
        };

        var service = new SessionService();
        var session = await service.CreateAsync(options);

        return session.Url;
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
        var stripeEvent = EventUtility.ConstructEvent(json, signature, _webhookSecret);

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

        var service = new SubscriptionService();
        await service.CancelAsync(tenant.StripeSubscriptionId);

        tenant.SubscriptionStatus = "Cancelled";
        tenant.CancelledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
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

        tenant.StripeSubscriptionId = session.Subscription?.ToString();
        tenant.PlanTipo = planCode ?? tenant.PlanTipo;
        tenant.SubscriptionStatus = "Active";
        tenant.FechaSuscripcion = DateTime.UtcNow;
        tenant.FechaExpiracion = DateTime.UtcNow.AddMonths(1); // Will be updated by invoice.paid
        tenant.Activo = true;
        tenant.CancelledAt = null;
        tenant.CancellationReason = null;

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

        // Extend subscription
        tenant.SubscriptionStatus = "Active";
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

        if (subscription.Status == "active")
            tenant.SubscriptionStatus = "Active";
        else if (subscription.Status == "past_due")
            tenant.SubscriptionStatus = "PastDue";

        await _db.SaveChangesAsync();

        _logger.LogInformation("Subscription updated for tenant {TenantId}, status: {Status}",
            tenant.Id, subscription.Status);
    }
}
