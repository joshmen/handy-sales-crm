namespace HandySuites.Billing.Api.Middleware;

/// <summary>
/// Adds security headers to all HTTP responses (OWASP defense-in-depth).
/// Espejo de apps/api/src/HandySuites.Api/Middleware/SecurityHeadersMiddleware.cs —
/// Billing API es microservicio standalone (sin project ref a Main API).
/// CSP especialmente importante: la API expone CFDI con datos PII fiscales.
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
        var isSwagger = path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase);

        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        context.Response.Headers["Content-Security-Policy"] = isSwagger
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
            : "default-src 'none'";

        if (!isSwagger)
            context.Response.Headers["Cache-Control"] = "no-store";

        await _next(context);
    }
}
