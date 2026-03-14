using HandySales.Api.Hubs;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Email;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySales.Api.Workers;

/// <summary>
/// Background worker that monitors subscription expiration and trial drip emails.
/// Runs every hour to:
/// 1. Send trial drip emails (day 3, 7, 10, 12)
/// 2. Send expiration warnings (7 days, 3 days, 1 day before)
/// 3. Mark expired subscriptions
/// 4. Deactivate tenants after grace period
/// </summary>
public class SubscriptionMonitor : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<SubscriptionMonitor> _logger;

    private static readonly int[] WarningDays = [7, 3, 1];
    private static readonly int[] TrialDripDays = [3, 7, 10, 12];
    private const int GracePeriodDays = 7;
    private const int TrialGracePeriodDays = 3;

    public SubscriptionMonitor(IServiceProvider services, ILogger<SubscriptionMonitor> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SubscriptionMonitor started");

        // Wait 30 seconds after startup before first check
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckSubscriptionsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking subscriptions");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task CheckSubscriptionsAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var cache = scope.ServiceProvider.GetRequiredService<IMemoryCache>();
        var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<NotificationHub>>();

        var now = DateTime.UtcNow;

        // 1. Send trial drip emails (value + urgency)
        await SendTrialDripEmailsAsync(db, emailService, now, ct);

        // 2. Send expiration warnings for active tenants approaching expiration
        await SendExpirationWarningsAsync(db, emailService, now, ct);

        // 3. Mark expired subscriptions + set grace period
        await MarkExpiredSubscriptionsAsync(db, emailService, now, ct);

        // 4. Deactivate tenants past grace period
        await DeactivateExpiredTenantsAsync(db, cache, hubContext, emailService, now, ct);
    }

    private async Task SendTrialDripEmailsAsync(
        HandySalesDbContext db, IEmailService emailService,
        DateTime now, CancellationToken ct)
    {
        // Find active trial tenants that haven't collected a card yet
        var trialTenants = await db.Tenants
            .Where(t => t.Activo
                && t.SubscriptionStatus == "Trial"
                && t.TrialEndsAt != null
                && t.TrialCardCollectedAt == null)
            .ToListAsync(ct);

        foreach (var tenant in trialTenants)
        {
            var trialStarted = tenant.TrialEndsAt!.Value.AddDays(-14);
            var daysSinceStart = (int)(now - trialStarted).TotalDays;

            foreach (var dripDay in TrialDripDays)
            {
                if (daysSinceStart < dripDay) continue;

                // Check if already sent
                var alreadySent = await db.ScheduledActions
                    .AnyAsync(a => a.ActionType == "SendTrialDrip"
                        && a.TargetId == tenant.Id
                        && a.Status == "Executed"
                        && a.Notes == $"day:{dripDay}", ct);

                if (alreadySent) continue;

                var adminEmails = await db.Usuarios
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(u => u.TenantId == tenant.Id && u.EsAdmin && u.Activo)
                    .Select(u => u.Email)
                    .ToListAsync(ct);

                if (adminEmails.Count == 0) continue;

                var daysLeft = Math.Max(0, (int)(tenant.TrialEndsAt.Value - now).TotalDays);
                var (subject, body) = dripDay switch
                {
                    3 => ("Tip: Configura tu catálogo - HandySales",
                          EmailTemplates.TrialValueDay3(tenant.NombreEmpresa)),
                    7 => ("Tip: Crea tu primera ruta - HandySales",
                          EmailTemplates.TrialValueDay7(tenant.NombreEmpresa)),
                    10 => ($"Te quedan {daysLeft} días de prueba - HandySales",
                           EmailTemplates.TrialUrgencyDay10(tenant.NombreEmpresa, daysLeft)),
                    12 => ($"Solo {daysLeft} días para que termine tu prueba - HandySales",
                           EmailTemplates.TrialUrgencyDay12(tenant.NombreEmpresa, daysLeft)),
                    _ => (string.Empty, string.Empty)
                };

                if (string.IsNullOrEmpty(subject)) continue;

                await emailService.SendBulkAsync(adminEmails!, subject, body);

                db.ScheduledActions.Add(new ScheduledAction
                {
                    ActionType = "SendTrialDrip",
                    TargetId = tenant.Id,
                    ScheduledAt = now,
                    ExecutedAt = now,
                    Status = "Executed",
                    NotificationSent = true,
                    Notes = $"day:{dripDay}",
                    CreatedByUserId = 0,
                    CreadoEn = now
                });

                _logger.LogInformation("Sent trial drip day {Day} to tenant {TenantId} ({Name})",
                    dripDay, tenant.Id, tenant.NombreEmpresa);
            }
        }

        if (trialTenants.Count > 0)
            await db.SaveChangesAsync(ct);
    }

    private async Task SendExpirationWarningsAsync(
        HandySalesDbContext db, IEmailService emailService,
        DateTime now, CancellationToken ct)
    {
        foreach (var days in WarningDays)
        {
            var warningDate = now.AddDays(days);

            // Find active tenants expiring within this window that haven't been warned
            var tenantsToWarn = await db.Tenants
                .Where(t => t.Activo
                    && t.FechaExpiracion != null
                    && t.FechaExpiracion <= warningDate
                    && t.FechaExpiracion > now
                    && (t.SubscriptionStatus == "Active" || t.SubscriptionStatus == "Trial"))
                .ToListAsync(ct);

            foreach (var tenant in tenantsToWarn)
            {
                var daysLeft = (int)(tenant.FechaExpiracion!.Value - now).TotalDays;
                if (daysLeft < 0) daysLeft = 0;

                // Check if we already sent a warning for this day range
                var alreadySent = await db.ScheduledActions
                    .AnyAsync(a => a.ActionType == "SendExpirationWarning"
                        && a.TargetId == tenant.Id
                        && a.Status == "Executed"
                        && a.Notes == $"days:{days}"
                        && a.ExecutedAt > now.AddDays(-1), ct);

                if (alreadySent) continue;

                // Send warning email
                var adminEmails = await db.Usuarios
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(u => u.TenantId == tenant.Id && u.EsAdmin && u.Activo)
                    .Select(u => u.Email)
                    .ToListAsync(ct);

                var emailBody = EmailTemplates.SubscriptionExpiringWarning(
                    tenant.NombreEmpresa, daysLeft, tenant.FechaExpiracion.Value);

                await emailService.SendBulkAsync(adminEmails!, "Su suscripción está por vencer - HandySales", emailBody);

                // Record that we sent the warning
                db.ScheduledActions.Add(new ScheduledAction
                {
                    ActionType = "SendExpirationWarning",
                    TargetId = tenant.Id,
                    ScheduledAt = now,
                    ExecutedAt = now,
                    Status = "Executed",
                    NotificationSent = true,
                    Notes = $"days:{days}",
                    CreatedByUserId = 0,
                    CreadoEn = now
                });

                _logger.LogInformation("Sent {Days}-day expiration warning to tenant {TenantId} ({Name})",
                    daysLeft, tenant.Id, tenant.NombreEmpresa);
            }

            if (tenantsToWarn.Count > 0)
                await db.SaveChangesAsync(ct);
        }
    }

    private async Task MarkExpiredSubscriptionsAsync(
        HandySalesDbContext db, IEmailService emailService,
        DateTime now, CancellationToken ct)
    {
        // Find active tenants whose subscription just expired
        var expiredTenants = await db.Tenants
            .Where(t => t.Activo
                && t.FechaExpiracion != null
                && t.FechaExpiracion <= now
                && (t.SubscriptionStatus == "Active" || t.SubscriptionStatus == "Trial"))
            .ToListAsync(ct);

        foreach (var tenant in expiredTenants)
        {
            // Trial expiration with card collected: Stripe will auto-charge via invoice.paid webhook.
            // Don't mark as expired — let Stripe handle the transition.
            if (tenant.SubscriptionStatus == "Trial"
                && tenant.TrialCardCollectedAt != null
                && !string.IsNullOrEmpty(tenant.StripeSubscriptionId))
            {
                _logger.LogInformation(
                    "Trial ended for tenant {TenantId} ({Name}) — card on file, waiting for Stripe invoice",
                    tenant.Id, tenant.NombreEmpresa);
                continue;
            }

            // Trial expired without card: shorter grace period (3 days)
            var graceDays = tenant.SubscriptionStatus == "Trial" ? TrialGracePeriodDays : GracePeriodDays;

            var previousStatus = tenant.SubscriptionStatus;
            tenant.SubscriptionStatus = "Expired";
            tenant.GracePeriodEnd = now.AddDays(graceDays);

            // Send expiration email
            var adminEmails = await db.Usuarios
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(u => u.TenantId == tenant.Id && u.EsAdmin && u.Activo)
                .Select(u => u.Email)
                .ToListAsync(ct);

            var subject = tenant.TrialEndsAt != null
                ? "Tu periodo de prueba ha terminado - HandySales"
                : "Su suscripción ha expirado - HandySales";
            var emailBody = EmailTemplates.SubscriptionExpired(tenant.NombreEmpresa);
            await emailService.SendBulkAsync(adminEmails!, subject, emailBody);

            _logger.LogInformation("Tenant {TenantId} ({Name}) expired (was {PreviousStatus}). Grace period: {Days} days until {GraceEnd}",
                tenant.Id, tenant.NombreEmpresa, previousStatus, graceDays, tenant.GracePeriodEnd);
        }

        if (expiredTenants.Count > 0)
            await db.SaveChangesAsync(ct);
    }

    private async Task DeactivateExpiredTenantsAsync(
        HandySalesDbContext db, IMemoryCache cache,
        IHubContext<NotificationHub> hubContext, IEmailService emailService,
        DateTime now, CancellationToken ct)
    {
        // Find tenants past grace period that are still active
        var tenantsToDeactivate = await db.Tenants
            .Where(t => t.Activo
                && t.SubscriptionStatus == "Expired"
                && t.GracePeriodEnd != null
                && t.GracePeriodEnd <= now)
            .ToListAsync(ct);

        // Also check PastDue tenants past grace period (failed payments)
        var pastDueTenants = await db.Tenants
            .Where(t => t.Activo
                && t.SubscriptionStatus == "PastDue"
                && t.GracePeriodEnd != null
                && t.GracePeriodEnd <= now)
            .ToListAsync(ct);

        tenantsToDeactivate.AddRange(pastDueTenants);

        foreach (var tenant in tenantsToDeactivate)
        {
            tenant.Activo = false;

            // Invalidate sessions
            var tenantUsers = await db.Usuarios
                .IgnoreQueryFilters()
                .Where(u => u.TenantId == tenant.Id && u.Activo)
                .ToListAsync(ct);

            foreach (var user in tenantUsers)
            {
                user.SessionVersion++;
                cache.Remove($"session_version_{user.Id}");
            }

            // Revoke refresh tokens
            var userIds = tenantUsers.Select(u => u.Id).ToList();
            var activeTokens = await db.RefreshTokens
                .Where(rt => userIds.Contains(rt.UserId) && !rt.IsRevoked && rt.ExpiresAt > now)
                .ToListAsync(ct);

            foreach (var token in activeTokens)
            {
                token.IsRevoked = true;
                token.RevokedAt = now;
            }

            cache.Remove($"tenant_active:{tenant.Id}");

            // Push ForceLogout
            await hubContext.Clients.Group($"tenant:{tenant.Id}")
                .SendAsync("ForceLogout", new { reason = "TENANT_DEACTIVATED" }, ct);

            // Send deactivation email
            var adminEmails = tenantUsers
                .Where(u => u.EsAdmin && !string.IsNullOrEmpty(u.Email))
                .Select(u => u.Email)
                .ToList();

            var emailBody = EmailTemplates.TenantDeactivated(tenant.NombreEmpresa);
            await emailService.SendBulkAsync(adminEmails!, "Cuenta Desactivada - HandySales", emailBody);

            _logger.LogInformation("Auto-deactivated tenant {TenantId} ({Name}) — grace period ended",
                tenant.Id, tenant.NombreEmpresa);
        }

        if (tenantsToDeactivate.Count > 0)
            await db.SaveChangesAsync(ct);
    }
}
