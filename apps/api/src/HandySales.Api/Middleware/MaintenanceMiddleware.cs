using System.Security.Claims;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySales.Api.Middleware;

/// <summary>
/// Blocks write operations (POST/PUT/PATCH/DELETE) when maintenance mode is active.
/// SuperAdmin is always exempt. Auth and health endpoints are always allowed.
/// </summary>
public class MaintenanceMiddleware
{
    private readonly RequestDelegate _next;
    public const string CacheKey = "MaintenanceMode";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(15);

    // Paths that are always allowed regardless of maintenance mode
    private static readonly string[] AllowedPrefixes = { "/auth", "/health", "/swagger" };

    // HTTP methods considered "write" operations
    private static readonly string[] WriteMethods = { "POST", "PUT", "PATCH", "DELETE" };

    public MaintenanceMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, HandySalesDbContext db, IMemoryCache cache)
    {
        // Allow all GET/HEAD/OPTIONS requests
        if (!WriteMethods.Contains(context.Request.Method))
        {
            await _next(context);
            return;
        }

        // Allow exempt paths
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (AllowedPrefixes.Any(prefix => path.StartsWith(prefix)))
        {
            await _next(context);
            return;
        }

        // Check maintenance mode (cached for 15s)
        var (isMaintenanceActive, maintenanceMessage) = await GetMaintenanceStatus(db, cache);

        if (!isMaintenanceActive)
        {
            await _next(context);
            return;
        }

        // SuperAdmin is always exempt
        var isSuperAdmin = context.User.FindFirstValue("es_super_admin") == "True"
                          || context.User.HasClaim(ClaimTypes.Role, "SuperAdmin");

        if (isSuperAdmin)
        {
            await _next(context);
            return;
        }

        // Block the write request
        context.Response.StatusCode = 503;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            code = "MAINTENANCE_MODE",
            message = maintenanceMessage ?? "Sistema en mantenimiento. Las operaciones de escritura están temporalmente deshabilitadas.",
        });
    }

    private static async Task<(bool IsActive, string? Message)> GetMaintenanceStatus(
        HandySalesDbContext db, IMemoryCache cache)
    {
        if (cache.TryGetValue(CacheKey, out (bool IsActive, string? Message) cached))
            return cached;

        var settings = await db.GlobalSettings.AsNoTracking().FirstOrDefaultAsync();
        var result = (settings?.MaintenanceMode ?? false, settings?.MaintenanceMessage);

        cache.Set(CacheKey, result, CacheDuration);
        return result;
    }
}
