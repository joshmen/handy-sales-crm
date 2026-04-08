using System.Security.Claims;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySuites.Mobile.Api.Middleware;

/// <summary>
/// Validates that the mobile device session has not been revoked by admin.
/// Checks DeviceSession status via the X-Device-Fingerprint header.
/// </summary>
public class MobileSessionValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;

    public MobileSessionValidationMiddleware(RequestDelegate next, IMemoryCache cache)
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

        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? context.User.FindFirstValue("sub");
        var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            await _next(context);
            return;
        }

        // If fingerprint is absent, check if user has any device sessions — if so, require it
        if (string.IsNullOrEmpty(deviceFingerprint))
        {
            var cacheKeyHasSessions = $"has_device_sessions_{userId}";
            if (!_cache.TryGetValue<bool>(cacheKeyHasSessions, out var hasSessions))
            {
                using var scopeCheck = context.RequestServices.CreateScope();
                var dbCheck = scopeCheck.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                hasSessions = await dbCheck.DeviceSessions
                    .IgnoreQueryFilters()
                    .AnyAsync(ds => ds.UsuarioId == userId && ds.EliminadoEn == null);
                _cache.Set(cacheKeyHasSessions, hasSessions, TimeSpan.FromMinutes(2));
            }

            if (hasSessions)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "DEVICE_FINGERPRINT_REQUIRED",
                    message = "Se requiere el header X-Device-Fingerprint para este usuario."
                });
                return;
            }
        }

        // Check device session status when fingerprint is present
        if (!string.IsNullOrEmpty(deviceFingerprint))
        {
            var cacheKey = $"device_status_{userId}_{deviceFingerprint}";
            if (!_cache.TryGetValue<SessionStatus>(cacheKey, out var sessionStatus))
            {
                using var scope = context.RequestServices.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

                var session = await db.DeviceSessions
                    .IgnoreQueryFilters()
                    .Where(ds => ds.UsuarioId == userId &&
                                 ds.DeviceFingerprint == deviceFingerprint &&
                                 ds.EliminadoEn == null)
                    .OrderByDescending(ds => ds.LastActivity)
                    .Select(ds => new { ds.Status })
                    .FirstOrDefaultAsync();

                if (session == null)
                {
                    // Unknown fingerprint — check if user has other sessions
                    var hasOtherSessions = await db.DeviceSessions
                        .IgnoreQueryFilters()
                        .AnyAsync(ds => ds.UsuarioId == userId && ds.EliminadoEn == null);

                    sessionStatus = hasOtherSessions ? SessionStatus.RevokedByAdmin : SessionStatus.Active;

                    if (hasOtherSessions)
                    {
                        _cache.Set(cacheKey, sessionStatus, TimeSpan.FromSeconds(30));
                        context.Response.StatusCode = 401;
                        await context.Response.WriteAsJsonAsync(new
                        {
                            code = "DEVICE_NOT_RECOGNIZED",
                            message = "Dispositivo no reconocido. Registra este dispositivo o contacta a tu administrador."
                        });
                        return;
                    }
                }

                sessionStatus = session?.Status ?? SessionStatus.Active;
                _cache.Set(cacheKey, sessionStatus, TimeSpan.FromSeconds(30));
            }

            if (sessionStatus == SessionStatus.RevokedByAdmin ||
                sessionStatus == SessionStatus.PendingUnbind)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "DEVICE_REVOKED",
                    message = "Tu acceso fue revocado por el administrador. Contacta a tu administrador."
                });
                return;
            }

            if (sessionStatus == SessionStatus.Unbound)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsJsonAsync(new
                {
                    code = "DEVICE_REVOKED",
                    message = "Este dispositivo fue desvinculado. Contacta a tu administrador para volver a acceder."
                });
                return;
            }
        }

        await _next(context);
    }

    private static bool ShouldSkipValidation(string path)
    {
        return path.StartsWith("/api/mobile/auth/login") ||
               path.StartsWith("/api/mobile/auth/refresh") ||
               path.StartsWith("/api/mobile/auth/ack-unbind") ||
               path.StartsWith("/api/crash-reports") ||
               path.StartsWith("/health") ||
               path.StartsWith("/swagger") ||
               path == "/";
    }
}
