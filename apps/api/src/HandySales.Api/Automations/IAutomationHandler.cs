using System.Text.Json;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Application.Notifications.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Automations;

public interface IAutomationHandler
{
    string Slug { get; }
    Task<AutomationResult> ExecuteAsync(AutomationContext context, CancellationToken ct);
}

public record AutomationContext(
    TenantAutomation Automation,
    HandySalesDbContext Db,
    INotificationService Notifications
)
{
    public int TenantId => Automation.TenantId;

    /// <summary>
    /// Parse a typed param from the automation's JSON config, falling back to a default value.
    /// </summary>
    public T GetParam<T>(string key, T defaultValue)
    {
        if (string.IsNullOrEmpty(Automation.ParamsJson))
            return defaultValue;

        try
        {
            var doc = JsonSerializer.Deserialize<JsonElement>(Automation.ParamsJson);
            if (doc.TryGetProperty(key, out var prop))
            {
                if (typeof(T) == typeof(int) && prop.TryGetInt32(out var intVal))
                    return (T)(object)intVal;
                if (typeof(T) == typeof(bool) && prop.ValueKind is JsonValueKind.True or JsonValueKind.False)
                    return (T)(object)prop.GetBoolean();
                if (typeof(T) == typeof(string))
                    return (T)(object)(prop.GetString() ?? defaultValue?.ToString() ?? "");
            }
        }
        catch { /* use default */ }

        return defaultValue;
    }

    /// <summary>
    /// Find the first active ADMIN user for this tenant.
    /// </summary>
    public async Task<int?> GetAdminUserIdAsync(CancellationToken ct)
    {
        return await Db.Usuarios
            .Where(u => u.TenantId == TenantId && u.Activo && u.Rol == "ADMIN")
            .Select(u => (int?)u.Id)
            .FirstOrDefaultAsync(ct);
    }
}

public record AutomationResult(bool Success, string ActionTaken, string? Error = null);
