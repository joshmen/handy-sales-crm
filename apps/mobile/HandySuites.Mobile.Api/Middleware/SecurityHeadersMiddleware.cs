namespace HandySuites.Mobile.Api.Middleware;

/// <summary>
/// Adds security headers to all HTTP responses (OWASP defense-in-depth).
/// Espejo de apps/api/src/HandySuites.Api/Middleware/SecurityHeadersMiddleware.cs —
/// Mobile API es microservicio standalone (sin project ref a Main API).
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";

        // Skip strict CSP for Swagger UI (needs scripts, styles, images)
        var isSwagger = path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase);

        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        // Mobile API es consumido por la app móvil — geolocation se necesita
        // (mapa, GPS tracking) → permitida en self. Cámara/mic no son usadas
        // por la API directamente sino por la app que la consume.
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)";
        context.Response.Headers["Content-Security-Policy"] = isSwagger
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
            : "default-src 'none'";

        if (!isSwagger)
            context.Response.Headers["Cache-Control"] = "no-store";

        await _next(context);
    }
}
