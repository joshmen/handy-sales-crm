using HandySales.Api.Hubs;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Email;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySales.Api.Workers;

/// <summary>
/// Background worker that processes scheduled actions (e.g., deactivate tenant at a future date).
/// Polls every 60 seconds for pending actions that are due.
/// </summary>
public class ScheduledActionProcessor : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ScheduledActionProcessor> _logger;

    public ScheduledActionProcessor(IServiceProvider services, ILogger<ScheduledActionProcessor> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ScheduledActionProcessor started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingActionsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing scheduled actions");
            }

            await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
        }
    }

    private async Task ProcessPendingActionsAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();

        var pendingActions = await db.ScheduledActions
            .Where(a => a.Status == "Pending" && a.ScheduledAt <= DateTime.UtcNow)
            .OrderBy(a => a.ScheduledAt)
            .Take(10)
            .ToListAsync(ct);

        if (pendingActions.Count == 0) return;

        var cache = scope.ServiceProvider.GetRequiredService<IMemoryCache>();
        var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<NotificationHub>>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        foreach (var action in pendingActions)
        {
            try
            {
                switch (action.ActionType)
                {
                    case "DeactivateTenant":
                        await ExecuteDeactivateTenantAsync(action, db, cache, hubContext, emailService, ct);
                        break;

                    case "SendExpirationWarning":
                        await ExecuteSendExpirationWarningAsync(action, db, emailService, ct);
                        break;
                }

                action.Status = "Executed";
                action.ExecutedAt = DateTime.UtcNow;
                _logger.LogInformation("Executed scheduled action {Type} for target {Id}", action.ActionType, action.TargetId);
            }
            catch (Exception ex)
            {
                action.Status = "Failed";
                action.Notes = (action.Notes ?? "") + $"\nError: {ex.Message}";
                _logger.LogError(ex, "Failed to execute scheduled action {Type} for {Id}", action.ActionType, action.TargetId);
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task ExecuteDeactivateTenantAsync(
        ScheduledAction action, HandySalesDbContext db,
        IMemoryCache cache, IHubContext<NotificationHub> hubContext,
        IEmailService emailService, CancellationToken ct)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == action.TargetId, ct);
        if (tenant == null || !tenant.Activo) return;

        // Deactivate tenant
        tenant.Activo = false;
        tenant.SubscriptionStatus = "Expired";

        // Invalidate all user sessions
        var tenantUsers = await db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == action.TargetId && u.Activo)
            .ToListAsync(ct);

        foreach (var user in tenantUsers)
        {
            user.SessionVersion++;
            cache.Remove($"session_version_{user.Id}");
        }

        // Revoke refresh tokens
        var userIds = tenantUsers.Select(u => u.Id).ToList();
        var activeTokens = await db.RefreshTokens
            .Where(rt => userIds.Contains(rt.UserId) && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync(ct);

        foreach (var token in activeTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        // Create notification for each user
        foreach (var user in tenantUsers)
        {
            db.NotificationHistory.Add(new NotificationHistory
            {
                TenantId = action.TargetId,
                UsuarioId = user.Id,
                Titulo = "Cuenta Desactivada",
                Mensaje = action.Reason ?? "Su empresa ha sido desactivada.",
                Tipo = NotificationType.System,
                Status = NotificationStatus.Sent,
                CreadoEn = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync(ct);

        // Invalidate tenant cache
        cache.Remove($"tenant_active:{action.TargetId}");

        // Push ForceLogout via SignalR
        await hubContext.Clients.Group($"tenant:{action.TargetId}")
            .SendAsync("ForceLogout", new { reason = "TENANT_DEACTIVATED" }, ct);

        // Send email notifications
        var adminEmails = tenantUsers
            .Where(u => u.EsAdmin && !string.IsNullOrEmpty(u.Email))
            .Select(u => u.Email)
            .ToList();

        var emailBody = EmailTemplates.TenantDeactivated(tenant.NombreEmpresa);
        await emailService.SendBulkAsync(adminEmails!, "Cuenta Desactivada - HandySales", emailBody);
    }

    private async Task ExecuteSendExpirationWarningAsync(
        ScheduledAction action, HandySalesDbContext db,
        IEmailService emailService, CancellationToken ct)
    {
        var tenant = await db.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == action.TargetId, ct);
        if (tenant == null || !tenant.Activo || tenant.FechaExpiracion == null) return;

        var daysLeft = (int)(tenant.FechaExpiracion.Value - DateTime.UtcNow).TotalDays;
        if (daysLeft < 0) daysLeft = 0;

        var adminEmails = await db.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == action.TargetId && u.EsAdmin && u.Activo)
            .Select(u => u.Email)
            .ToListAsync(ct);

        var emailBody = EmailTemplates.SubscriptionExpiringWarning(
            tenant.NombreEmpresa, daysLeft, tenant.FechaExpiracion.Value);

        await emailService.SendBulkAsync(adminEmails!, "Su suscripción está por vencer - HandySales", emailBody);

        action.NotificationSent = true;
    }
}
