using System.Security.Claims;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySuites.Mobile.Api.Middleware;

/// <summary>
/// Audit 2026-05-18 — rediseño Netflix/Spotify-style session model.
///
/// Valida que la DeviceSession del request (identificada por el claim `sid`
/// del JWT) siga Active. Si no, devuelve 401 SESSION_REVOKED uniforme.
///
/// Cambio vs versión anterior (DEVICE_BOUND / DEVICE_NOT_RECOGNIZED /
/// DEVICE_FINGERPRINT_REQUIRED): un solo código de error, vinculado
/// criptográficamente al token (no por fingerprint match frágil).
///
/// Backward compat: JWTs sin claim `sid` (legacy pre-deploy) se aceptan
/// durante window de 30 días. Después de eso se rechazan también.
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
        // Skip para requests no autenticadas (login, refresh, etc.)
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        // Skip paths excluidos (login/refresh/health/swagger).
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        if (ShouldSkipValidation(path))
        {
            await _next(context);
            return;
        }

        // Si el JWT no tiene claim `sid` (token legacy generado antes del
        // rediseño 2026-05-18), permitir paso durante backward-compat window.
        // Tokens viejos expiran <30d, naturalmente se renuevan con sid.
        var sidClaim = context.User.FindFirstValue("sid");
        if (string.IsNullOrEmpty(sidClaim) || !int.TryParse(sidClaim, out var sessionId))
        {
            await _next(context);
            return;
        }

        // Validate session status (cached 30s).
        var cacheKey = $"session_status_{sessionId}";
        if (!_cache.TryGetValue<SessionStatus>(cacheKey, out var status))
        {
            using var scope = context.RequestServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            var session = await db.DeviceSessions
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(ds => ds.Id == sessionId && ds.EliminadoEn == null)
                .Select(ds => new { ds.Status })
                .FirstOrDefaultAsync();

            // Si la sesión no existe (purgada manualmente) → tratarla como Revoked.
            status = session?.Status ?? SessionStatus.RevokedByAdmin;
            _cache.Set(cacheKey, status, TimeSpan.FromSeconds(30));
        }

        if (status == SessionStatus.Active)
        {
            await _next(context);
            return;
        }

        // Cualquier otro estado = revocada. Mensaje uniforme; cliente lo
        // maneja como banner "Sesión cerrada, iniciar sesión de nuevo".
        // El cliente NO debe auto-loguear (para preservar pending data en WDB).
        context.Response.StatusCode = 401;
        await context.Response.WriteAsJsonAsync(new
        {
            code = "SESSION_REVOKED",
            message = "Tu sesión fue cerrada. Por favor inicia sesión de nuevo."
        });
    }

    private static bool ShouldSkipValidation(string path)
    {
        return path.StartsWith("/api/mobile/auth/login") ||
               path.StartsWith("/api/mobile/auth/force-login") ||  // legacy, deprecated
               path.StartsWith("/api/mobile/auth/revoke-and-login") ||  // nuevo
               path.StartsWith("/api/mobile/auth/refresh") ||
               path.StartsWith("/api/mobile/auth/ack-unbind") ||
               path.StartsWith("/api/crash-reports") ||
               path.StartsWith("/health") ||
               path.StartsWith("/swagger") ||
               path == "/";
    }
}
