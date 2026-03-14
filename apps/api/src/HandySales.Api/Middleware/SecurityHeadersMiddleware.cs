namespace HandySales.Api.Middleware;

/// <summary>
/// Adds security headers to all HTTP responses.
/// OWASP recommended headers for defense-in-depth.
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
        // Prevent MIME-type sniffing
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";

        // Prevent clickjacking
        context.Response.Headers["X-Frame-Options"] = "DENY";

        // XSS protection (legacy browsers)
        context.Response.Headers["X-XSS-Protection"] = "1; mode=block";

        // Strict Transport Security (HTTPS only, 1 year)
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

        // Prevent referrer leakage
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // Restrict permissions (camera, microphone, geolocation, etc.)
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)";

        // Content Security Policy — API-only, no inline scripts/styles needed
        context.Response.Headers["Content-Security-Policy"] = "default-src 'none'";

        // Prevent caching of sensitive API responses
        context.Response.Headers["Cache-Control"] = "no-store";

        await _next(context);
    }
}
