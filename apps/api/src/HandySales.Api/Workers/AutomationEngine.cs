using System.Text.Json;
using HandySales.Api.Automations;
using HandySales.Application.Automations.Interfaces;
using HandySales.Application.Notifications.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Email;
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

        // Use one scope just to fetch the automation list
        using (var listScope = _services.CreateScope())
        {
            var repo = listScope.ServiceProvider.GetRequiredService<IAutomationRepository>();
            automations = await repo.GetAllActiveTenantAutomationsAsync();
            if (automations.Count == 0) return;
        }

        var now = DateTime.UtcNow;

        // Batch-load tenant timezones to avoid N+1 queries
        Dictionary<int, string> tenantTimezones;
        using (var tzScope = _services.CreateScope())
        {
            var tzDb = tzScope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
            var tenantIds = automations.Select(a => a.TenantId).Distinct().ToList();
            tenantTimezones = await tzDb.CompanySettings
                .Where(cs => tenantIds.Contains(cs.TenantId))
                .ToDictionaryAsync(cs => cs.TenantId, cs => cs.Timezone, ct);
        }

        foreach (var automation in automations)
        {
            var tenantTz = tenantTimezones.GetValueOrDefault(automation.TenantId, "America/Mexico_City");
            if (string.IsNullOrEmpty(tenantTz)) tenantTz = "America/Mexico_City";
            if (!ShouldExecute(automation, now, tenantTz))
                continue;

            // Create a fresh scope per automation — isolates DbContext + handlers per tenant
            using var execScope = _services.CreateScope();

            var handler = execScope.ServiceProvider.GetServices<IAutomationHandler>()
                .FirstOrDefault(h => h.Slug == automation.Template.Slug);

            if (handler is null)
            {
                _logger.LogWarning("No handler found for automation slug: {Slug}", automation.Template.Slug);
                continue;
            }

            var db = execScope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
            var notifications = execScope.ServiceProvider.GetRequiredService<INotificationService>();
            var emailService = execScope.ServiceProvider.GetService<IEmailService>();
            var repo = execScope.ServiceProvider.GetRequiredService<IAutomationRepository>();

            try
            {
                var context = new AutomationContext(automation, db, notifications, emailService);
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
                        ErrorMessage = SanitizeErrorMessage(ex.Message),
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

    private static bool ShouldExecute(TenantAutomation automation, DateTime nowUtc, string tenantTimezone = "America/Mexico_City")
    {
        var template = automation.Template;

        // Condition triggers: run every poll cycle, but respect cooldown
        if (template.TriggerType == AutomationTriggerType.Condition)
        {
            // Cooldown: don't run more than once per hour
            if (automation.LastExecutedAt.HasValue && (nowUtc - automation.LastExecutedAt.Value).TotalMinutes < 60)
                return false;

            return true;
        }

        // Cron triggers: use tenant's "hora" param if available, else fall back to template cron
        if (template.TriggerType == AutomationTriggerType.Cron)
        {
            // Don't run more than once per day for cron jobs
            if (automation.LastExecutedAt.HasValue && automation.LastExecutedAt.Value.Date == nowUtc.Date)
                return false;

            // Try to read "hora" from tenant's ParamsJson (e.g. "22:31", "19:00")
            // This is in the tenant's local time (configured timezone)
            var horaLocal = GetParamString(automation.ParamsJson, "hora");
            if (!string.IsNullOrEmpty(horaLocal))
                return MatchesHoraParam(horaLocal, nowUtc, tenantTimezone);

            // Fall back to template cron (in UTC)
            if (!string.IsNullOrEmpty(template.TriggerCron))
                return MatchesCronWindow(template.TriggerCron, nowUtc);

            return false;
        }

        return false;
    }

    /// <summary>
    /// Match against a tenant-configured "hora" param (HH:mm in tenant's local time).
    /// Converts to UTC before comparing.
    /// </summary>
    private static bool MatchesHoraParam(string hora, DateTime nowUtc, string tenantTimezone = "America/Mexico_City")
    {
        var parts = hora.Split(':');
        if (parts.Length < 2) return false;
        if (!int.TryParse(parts[0], out var localHour)) return false;
        if (!int.TryParse(parts[1], out var localMinute)) return false;

        // Convert tenant's local time to UTC for comparison
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(tenantTimezone);
            var today = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz).Date;
            var localTarget = new DateTime(today.Year, today.Month, today.Day, localHour, localMinute, 0);
            var utcTarget = TimeZoneInfo.ConvertTimeToUtc(localTarget, tz);

            var diff = (nowUtc - utcTarget).TotalMinutes;
            return diff >= 0 && diff <= 4;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Simple cron matching for common patterns (times in UTC):
    /// "0 19 * * *" = daily at 19:00 UTC
    /// "0 6 * * 1" = Mondays at 06:00 UTC
    /// </summary>
    private static bool MatchesCronWindow(string cron, DateTime nowUtc)
    {
        var parts = cron.Split(' ');
        if (parts.Length < 5) return false;

        if (!int.TryParse(parts[0], out var minute)) return false;
        if (!int.TryParse(parts[1], out var hour)) return false;

        if (nowUtc.Hour != hour) return false;
        var minuteDiff = nowUtc.Minute - minute;
        if (minuteDiff < 0 || minuteDiff > 4) return false;

        if (parts[4] != "*" && int.TryParse(parts[4], out var dow))
        {
            if ((int)nowUtc.DayOfWeek != dow) return false;
        }

        if (parts[2] != "*" && int.TryParse(parts[2], out var dom))
        {
            if (nowUtc.Day != dom) return false;
        }

        return true;
    }

    /// <summary>
    /// Extract a string param from ParamsJson without allocating AutomationContext.
    /// </summary>
    private static string? GetParamString(string? paramsJson, string key)
    {
        if (string.IsNullOrEmpty(paramsJson)) return null;
        try
        {
            using var doc = JsonDocument.Parse(paramsJson);
            if (doc.RootElement.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.String)
                return prop.GetString();
        }
        catch { /* ignore */ }
        return null;
    }

    private static string SanitizeErrorMessage(string message)
    {
        if (string.IsNullOrEmpty(message)) return "Error desconocido";

        // Truncate to 500 chars max — prevents storing huge stack traces
        if (message.Length > 500)
            message = message[..500] + "...";

        return message;
    }
}
