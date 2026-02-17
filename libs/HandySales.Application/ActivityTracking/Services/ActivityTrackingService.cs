using HandySales.Domain.Entities;
using HandySales.Application.ActivityTracking.Interfaces;
using System.Text.Json;

namespace HandySales.Application.ActivityTracking.Services;

public interface IActivityTrackingService
{
    Task LogActivityAsync(int tenantId, int userId, string activityType, string activityCategory, string description, string status = "success", string? ipAddress = null, string? userAgent = null, string? requestMethod = null, string? requestUrl = null);
    Task LogEntityChangeAsync(int tenantId, int userId, string entityType, int entityId, string changeType, object? oldValues = null, object? newValues = null);
    Task LogSecurityEventAsync(int tenantId, int? userId, string eventType, string description, string? ipAddress = null, string riskLevel = "medium");
}

public class ActivityTrackingService : IActivityTrackingService
{
    private readonly IActivityTrackingRepository _repository;

    public ActivityTrackingService(IActivityTrackingRepository repository)
    {
        _repository = repository;
    }

    public async Task LogActivityAsync(int tenantId, int userId, string activityType, string activityCategory, string description, string status = "success", string? ipAddress = null, string? userAgent = null, string? requestMethod = null, string? requestUrl = null)
    {
        try
        {
            var activity = new ActivityLog
            {
                TenantId = tenantId,
                UserId = userId,
                ActivityType = activityType,
                ActivityCategory = activityCategory,
                ActivityStatus = status,
                Description = description,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                RequestMethod = requestMethod,
                RequestUrl = requestUrl,
                CreatedAt = DateTime.UtcNow
            };

            // Parse User-Agent if provided
            if (!string.IsNullOrEmpty(userAgent))
            {
                ParseUserAgent(userAgent, out var browser, out var browserVersion, out var os, out var deviceType);
                activity.Browser = browser;
                activity.BrowserVersion = browserVersion;
                activity.OperatingSystem = os;
                activity.DeviceType = deviceType;
            }

            await _repository.CreateActivityLogAsync(activity);
        }
        catch (Exception ex)
        {
            // Log error but don't fail the main process
            Console.WriteLine($"Error logging activity: {ex.Message}");
        }
    }

    public async Task LogEntityChangeAsync(int tenantId, int userId, string entityType, int entityId, string changeType, object? oldValues = null, object? newValues = null)
    {
        var additionalData = new Dictionary<string, object>();
        if (oldValues != null)
        {
            additionalData["oldValues"] = oldValues;
        }
        if (newValues != null)
        {
            additionalData["newValues"] = newValues;
        }

        var activity = new ActivityLog
        {
            TenantId = tenantId,
            UserId = userId,
            ActivityType = changeType.ToLower(),
            ActivityCategory = GetCategoryFromEntityType(entityType),
            ActivityStatus = "success",
            Description = $"{changeType} {entityType} #{entityId}",
            EntityType = entityType,
            EntityId = entityId,
            AdditionalData = additionalData.Any() ? JsonSerializer.Serialize(additionalData) : null,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.CreateActivityLogAsync(activity);
    }

    public async Task LogSecurityEventAsync(int tenantId, int? userId, string eventType, string description, string? ipAddress = null, string riskLevel = "medium")
    {
        var activity = new ActivityLog
        {
            TenantId = tenantId,
            UserId = userId ?? 0,
            ActivityType = eventType,
            ActivityCategory = "security",
            ActivityStatus = riskLevel == "high" ? "warning" : "info",
            Description = description,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow,
            AdditionalData = JsonSerializer.Serialize(new { riskLevel })
        };

        await _repository.CreateActivityLogAsync(activity);
    }

    private void ParseUserAgent(string userAgent, out string browser, out string browserVersion, out string os, out string deviceType)
    {
        browser = "Unknown";
        browserVersion = "";
        os = "Unknown";
        deviceType = "desktop";

        if (string.IsNullOrEmpty(userAgent))
            return;

        // Detect browser
        if (userAgent.Contains("Chrome"))
        {
            browser = "Chrome";
            var match = System.Text.RegularExpressions.Regex.Match(userAgent, @"Chrome/(\d+\.\d+)");
            if (match.Success) browserVersion = match.Groups[1].Value;
        }
        else if (userAgent.Contains("Firefox"))
        {
            browser = "Firefox";
            var match = System.Text.RegularExpressions.Regex.Match(userAgent, @"Firefox/(\d+\.\d+)");
            if (match.Success) browserVersion = match.Groups[1].Value;
        }
        else if (userAgent.Contains("Safari") && !userAgent.Contains("Chrome"))
        {
            browser = "Safari";
            var match = System.Text.RegularExpressions.Regex.Match(userAgent, @"Version/(\d+\.\d+)");
            if (match.Success) browserVersion = match.Groups[1].Value;
        }
        else if (userAgent.Contains("Edge"))
        {
            browser = "Edge";
            var match = System.Text.RegularExpressions.Regex.Match(userAgent, @"Edge/(\d+\.\d+)");
            if (match.Success) browserVersion = match.Groups[1].Value;
        }

        // Detect OS
        if (userAgent.Contains("Windows")) os = "Windows";
        else if (userAgent.Contains("Mac")) os = "macOS";
        else if (userAgent.Contains("Linux")) os = "Linux";
        else if (userAgent.Contains("Android")) os = "Android";
        else if (userAgent.Contains("iOS") || userAgent.Contains("iPhone") || userAgent.Contains("iPad")) 
            os = "iOS";

        // Detect device type
        if (userAgent.Contains("Mobile") || userAgent.Contains("Android") || userAgent.Contains("iPhone"))
            deviceType = "mobile";
        else if (userAgent.Contains("Tablet") || userAgent.Contains("iPad"))
            deviceType = "tablet";
    }

    private string GetCategoryFromEntityType(string entityType)
    {
        return entityType.ToLower() switch
        {
            "usuario" => "users",
            "cliente" => "clients",
            "producto" => "products",
            "pedido" => "orders",
            _ => "system"
        };
    }
}