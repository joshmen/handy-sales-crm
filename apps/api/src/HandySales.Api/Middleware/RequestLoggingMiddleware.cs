using System.Diagnostics;

namespace HandySales.Api.Middleware;

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
        var requestId = Guid.NewGuid().ToString("N")[..8];
        
        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["RequestId"] = requestId,
            ["Method"] = context.Request.Method,
            ["Path"] = context.Request.Path,
            ["QueryString"] = context.Request.QueryString.ToString()
        }))
        {
            _logger.LogInformation("Starting request");

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