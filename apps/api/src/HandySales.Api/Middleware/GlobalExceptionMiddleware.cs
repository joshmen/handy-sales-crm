using System.Net;
using System.Text.Json;

namespace HandySales.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly bool _isDevelopment;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IWebHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _isDevelopment = env.IsDevelopment();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred. Request: {Method} {Path}",
                context.Request.Method, context.Request.Path);

            await HandleExceptionAsync(context, ex, _isDevelopment);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception, bool isDevelopment)
    {
        context.Response.ContentType = "application/json; charset=utf-8";

        var response = new
        {
            Success = false,
            Message = GetErrorMessage(exception, isDevelopment),
            Data = (object?)null
        };

        context.Response.StatusCode = GetStatusCode(exception);

        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }

    private static string GetErrorMessage(Exception exception, bool isDevelopment)
    {
        var baseMessage = exception switch
        {
            ArgumentException => "Invalid request parameters",
            UnauthorizedAccessException => "Unauthorized access",
            KeyNotFoundException => "Resource not found",
            InvalidOperationException => "Invalid operation",
            _ => "An error occurred while processing your request"
        };

        // Only include exception details in development — never leak to production clients
        if (isDevelopment)
            return $"{baseMessage}: {exception.GetType().Name} - {exception.Message}";

        return baseMessage;
    }

    private static int GetStatusCode(Exception exception)
    {
        return exception switch
        {
            ArgumentException => (int)HttpStatusCode.BadRequest,
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            InvalidOperationException => (int)HttpStatusCode.InternalServerError,
            _ => (int)HttpStatusCode.InternalServerError
        };
    }
}