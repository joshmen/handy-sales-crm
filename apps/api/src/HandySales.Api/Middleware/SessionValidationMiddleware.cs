using System.Security.Claims;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySales.Api.Middleware;

/// <summary>
/// Validates that the session_version claim in the JWT matches the current value in the database.
/// If a user logs in from another device, session_version is incremented, invalidating old tokens.
/// </summary>
public class SessionValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    public SessionValidationMiddleware(RequestDelegate next, IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip for unauthenticated requests
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        // Skip for excluded paths
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        if (ShouldSkipValidation(path))
        {
            await _next(context);
            return;
        }

        // Skip for impersonation tokens (they don't have session_version)
        var isImpersonating = context.User.FindFirstValue("is_impersonating");
        if (isImpersonating == "true" || isImpersonating == "True")
        {
            await _next(context);
            return;
        }

        // Get session_version from JWT
        var sessionVersionClaim = context.User.FindFirstValue("session_version");
        var userIdClaim = context.User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)
                          ?? context.User.FindFirstValue("sub");

        if (string.IsNullOrEmpty(sessionVersionClaim) || string.IsNullOrEmpty(userIdClaim))
        {
            // Old tokens without session_version — allow through (backward compatible)
            await _next(context);
            return;
        }

        if (!int.TryParse(sessionVersionClaim, out var tokenVersion) || !int.TryParse(userIdClaim, out var userId))
        {
            await _next(context);
            return;
        }

        // Check DB session_version (cached for 30 seconds)
        var cacheKey = $"session_version_{userId}";
        if (!_cache.TryGetValue<int>(cacheKey, out var dbVersion))
        {
            using var scope = context.RequestServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();

            var usuario = await db.Usuarios
                .IgnoreQueryFilters()
                .Where(u => u.Id == userId)
                .Select(u => new { u.SessionVersion })
                .FirstOrDefaultAsync();

            if (usuario == null)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new { code = "USER_NOT_FOUND", message = "Usuario no encontrado" });
                return;
            }

            dbVersion = usuario.SessionVersion;
            _cache.Set(cacheKey, dbVersion, TimeSpan.FromSeconds(30));
        }

        if (tokenVersion != dbVersion)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new
            {
                code = "SESSION_REPLACED",
                message = "Tu sesión fue cerrada porque se inició sesión en otro dispositivo"
            });
            return;
        }

        await _next(context);
    }

    private static bool ShouldSkipValidation(string path)
    {
        return path.StartsWith("/auth/") ||
               path.StartsWith("/health") ||
               path.StartsWith("/swagger") ||
               path.StartsWith("/hubs/") ||
               path == "/";
    }
}
