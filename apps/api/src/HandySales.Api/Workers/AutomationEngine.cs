using HandySales.Api.Automations;
using HandySales.Application.Automations.Interfaces;
using HandySales.Application.Notifications.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Workers;

public class AutomationEngine : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<AutomationEngine> _logger;

    public AutomationEngine(IServiceProvider services, ILogger<AutomationEngine> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AutomationEngine started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAutomationsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break; // Graceful shutdown — not an error
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing automations");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break; // Graceful shutdown
            }
        }

        _logger.LogInformation("AutomationEngine stopped");
    }

    private async Task ProcessAutomationsAsync(CancellationToken ct)
    {
        List<TenantAutomation> automations;
        Dictionary<string, IAutomationHandler> handlerMap;

        // Use one scope just to fetch the automation list and build handler map
        using (var listScope = _services.CreateScope())
        {
            var repo = listScope.ServiceProvider.GetRequiredService<IAutomationRepository>();
            automations = await repo.GetAllActiveTenantAutomationsAsync();
            if (automations.Count == 0) return;

            handlerMap = listScope.ServiceProvider.GetServices<IAutomationHandler>()
                .ToDictionary(h => h.Slug, h => h);
        }

        var now = DateTime.UtcNow;

        foreach (var automation in automations)
        {
            if (!ShouldExecute(automation, now))
                continue;

            if (!handlerMap.TryGetValue(automation.Template.Slug, out var handler))
            {
                _logger.LogWarning("No handler found for automation slug: {Slug}", automation.Template.Slug);
                continue;
            }

            // Create a fresh scope per automation — isolates DbContext change tracker per tenant
            using var execScope = _services.CreateScope();
            var db = execScope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
            var notifications = execScope.ServiceProvider.GetRequiredService<INotificationService>();
            var repo = execScope.ServiceProvider.GetRequiredService<IAutomationRepository>();

            try
            {
                var context = new AutomationContext(automation, db, notifications);
                var result = await handler.ExecuteAsync(context, ct);

                await repo.LogAndUpdateAsync(new AutomationExecution
                {
                    TenantId = automation.TenantId,
                    AutomationId = automation.Id,
                    TemplateSlug = automation.Template.Slug,
                    Status = result.Success ? ExecutionStatus.Success : ExecutionStatus.Failed,
                    ActionTaken = result.ActionTaken,
                    ErrorMessage = result.Error,
                    EjecutadoEn = DateTime.UtcNow,
                }, automation.Id);

                if (result.Success)
                    _logger.LogInformation("Automation {Slug} (Tenant {TenantId}): {Action}", automation.Template.Slug, automation.TenantId, result.ActionTaken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing automation {Slug} for tenant {TenantId}", automation.Template.Slug, automation.TenantId);

                try
                {
                    await repo.LogExecutionAsync(new AutomationExecution
                    {
                        TenantId = automation.TenantId,
                        AutomationId = automation.Id,
                        TemplateSlug = automation.Template.Slug,
                        Status = ExecutionStatus.Failed,
                        ActionTaken = "",
                        ErrorMessage = ex.Message,
                        EjecutadoEn = DateTime.UtcNow,
                    });
                }
                catch (Exception logEx)
                {
                    _logger.LogError(logEx, "Failed to log automation error");
                }
            }
        }
    }

    private static bool ShouldExecute(TenantAutomation automation, DateTime now)
    {
        var template = automation.Template;

        // Condition triggers: run every poll cycle, but respect cooldown
        if (template.TriggerType == AutomationTriggerType.Condition)
        {
            // Cooldown: don't run more than once per hour
            if (automation.LastExecutedAt.HasValue && (now - automation.LastExecutedAt.Value).TotalMinutes < 60)
                return false;

            return true;
        }

        // Cron triggers: simple time-window matching (not a full cron parser)
        if (template.TriggerType == AutomationTriggerType.Cron && !string.IsNullOrEmpty(template.TriggerCron))
        {
            // Don't run more than once per day for cron jobs
            if (automation.LastExecutedAt.HasValue && automation.LastExecutedAt.Value.Date == now.Date)
                return false;

            return MatchesCronWindow(template.TriggerCron, now);
        }

        return false;
    }

    /// <summary>
    /// Simple cron matching for common patterns:
    /// "0 19 * * *" = daily at 19:00
    /// "0 6 * * 1" = Mondays at 06:00
    /// "0 18 * * 5" = Fridays at 18:00
    /// </summary>
    private static bool MatchesCronWindow(string cron, DateTime now)
    {
        var parts = cron.Split(' ');
        if (parts.Length < 5) return false;

        // Parse minute and hour
        if (!int.TryParse(parts[0], out var minute)) return false;
        if (!int.TryParse(parts[1], out var hour)) return false;

        // Check hour match (within the polling window — engine polls every 60s)
        if (now.Hour != hour) return false;
        var minuteDiff = now.Minute - minute;
        // Allow 0..4 minutes AFTER the target minute (never before)
        // Combined with the "once per day" guard in ShouldExecute, this ensures
        // the cron fires exactly once even if the engine has processing delays
        if (minuteDiff < 0 || minuteDiff > 4) return false;

        // Check day of week if specified (0=Sun, 1=Mon, ..., 6=Sat)
        if (parts[4] != "*" && int.TryParse(parts[4], out var dow))
        {
            if ((int)now.DayOfWeek != dow) return false;
        }

        // Check day of month if specified
        if (parts[2] != "*" && int.TryParse(parts[2], out var dom))
        {
            if (now.Day != dom) return false;
        }

        return true;
    }
}
