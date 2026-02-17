using System.Diagnostics;

namespace HandySales.Mobile.Api.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var deviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault() ?? "unknown";
        var appVersion = context.Request.Headers["X-App-Version"].FirstOrDefault() ?? "unknown";

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            _logger.LogInformation(
                "[Mobile] {Method} {Path} responded {StatusCode} in {ElapsedMs}ms [Device: {DeviceId}] [AppVersion: {AppVersion}]",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds,
                deviceId,
                appVersion);
        }
    }
}
