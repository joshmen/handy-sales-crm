using System.Diagnostics;

namespace HandySuites.Api.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    // Paths excluded from request logging to keep CloudWatch ingestion costs down.
    // Railway + uptime probes hit /health every ~10s; Swagger assets are noisy static;
    // hubs/* are SignalR negotiation traffic that creates ~1 log per page nav.
    private static readonly string[] ExcludedPathPrefixes =
    {
        "/health",
        "/healthz",
        "/swagger",
        "/hubs",
        "/favicon",
    };

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Fast-path exclusion: never allocate a scope or stopwatch for noisy paths.
        var path = context.Request.Path.Value;
        if (path != null)
        {
            foreach (var prefix in ExcludedPathPrefixes)
            {
                if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    await _next(context);
                    return;
                }
            }
        }

        var stopwatch = Stopwatch.StartNew();
        var requestId = Guid.NewGuid().ToString("N")[..8];

        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["RequestId"] = requestId,
            ["Method"] = context.Request.Method,
            ["Path"] = context.Request.Path,
            ["QueryString"] = context.Request.QueryString.ToString()
        }))
        {
            // "Starting request" was duplicating ingestion volume. Only log completion.
            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();

                var logLevel = context.Response.StatusCode >= 500
                    ? LogLevel.Error
                    : context.Response.StatusCode >= 400
                        ? LogLevel.Warning
                        : LogLevel.Information;

                _logger.Log(logLevel, "Request completed in {ElapsedMilliseconds}ms with status {StatusCode}",
                    stopwatch.ElapsedMilliseconds, context.Response.StatusCode);
            }
        }
    }
}
