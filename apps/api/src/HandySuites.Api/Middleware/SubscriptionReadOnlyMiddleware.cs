using System.Security.Claims;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySuites.Api.Middleware;

/// <summary>
/// Blocks write operations (POST, PUT, PATCH, DELETE) when the tenant's subscription
/// is Expired or PastDue. Read-only operations (GET, HEAD, OPTIONS) always pass through.
/// Certain paths (auth, subscription, stripe/webhook) are exempt so tenants can renew.
/// </summary>
public class SubscriptionReadOnlyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    private static readonly HashSet<string> BlockedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Expired",
        "PastDue"
    };

    private static readonly string[] ExemptPathSegments =
    {
        "/auth",
        "/subscription",
        "/stripe",
        "/webhook",
        "/health",
        "/hubs"
    };

    /// <summary>
    /// POST endpoints that are actually read-only (e.g. pagination via POST body).
    /// These should not be blocked for expired tenants.
    /// </summary>
    private static readonly string[] ReadOnlyPostPaths =
    {
        "/api/automations/historial"
    };

    public SubscriptionReadOnlyMiddleware(RequestDelegate next, IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Read-only HTTP methods always pass through
        if (IsReadOnlyMethod(context.Request.Method))
        {
            await _next(context);
            return;
        }

        // 2. Unauthenticated requests pass through (public endpoints)
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        // 3. No tenant_id claim → pass through (e.g. super admin without tenant context)
        var tenantIdClaim = context.User.FindFirstValue("tenant_id");
        if (string.IsNullOrEmpty(tenantIdClaim) || !int.TryParse(tenantIdClaim, out var tenantId) || tenantId <= 0)
        {
            await _next(context);
            return;
        }

        // 4. SUPER_ADMIN bypasses subscription checks
        if (context.User.IsInRole("SUPER_ADMIN"))
        {
            await _next(context);
            return;
        }

        // 5. Exempt paths (auth, subscription management, stripe, webhooks, health)
        var path = context.Request.Path.Value ?? "";
        if (IsExemptPath(path))
        {
            await _next(context);
            return;
        }

        // 6. Read-only POST endpoints (pagination via POST body)
        if (IsReadOnlyPostPath(path))
        {
            await _next(context);
            return;
        }

        // 7. Look up tenant subscription status (cached 5 minutes)
        var cacheKey = $"subscription_status:{tenantId}";
        if (!_cache.TryGetValue<string>(cacheKey, out var subscriptionStatus))
        {
            using var scope = context.RequestServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            var tenant = await db.Tenants
                .AsNoTracking()
                .Where(t => t.Id == tenantId)
                .Select(t => new { t.SubscriptionStatus })
                .FirstOrDefaultAsync();

            subscriptionStatus = tenant?.SubscriptionStatus ?? "Trial";
            _cache.Set(cacheKey, subscriptionStatus, TimeSpan.FromMinutes(5));
        }

        // 8. Block writes for Expired or PastDue subscriptions
        if (BlockedStatuses.Contains(subscriptionStatus ?? ""))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                code = "SUBSCRIPTION_EXPIRED",
                message = "Your subscription has expired. Renew to continue making changes."
            });
            return;
        }

        await _next(context);
    }

    private static bool IsReadOnlyMethod(string method)
        => HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method);

    private static bool IsExemptPath(string path)
    {
        foreach (var segment in ExemptPathSegments)
        {
            if (path.Contains(segment, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    private static bool IsReadOnlyPostPath(string path)
    {
        foreach (var p in ReadOnlyPostPaths)
        {
            if (path.Equals(p, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
}
