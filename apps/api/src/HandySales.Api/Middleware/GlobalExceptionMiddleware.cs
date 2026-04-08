using System.Net;
using System.Text.Json;

namespace HandySuites.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
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

            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json; charset=utf-8";

        var response = new
        {
            Success = false,
            Message = GetErrorMessage(exception),
            Data = (object?)null
        };

        context.Response.StatusCode = GetStatusCode(exception);

        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }

    private static string GetErrorMessage(Exception exception)
    {
        // Business logic exceptions: return the actual message (safe, written by us).
        // System exceptions: return generic message (avoid leaking internals).
        return exception switch
        {
            InvalidOperationException ex => !string.IsNullOrEmpty(ex.Message) ? ex.Message : "No se pudo completar la operación.",
            ArgumentException ex => !string.IsNullOrEmpty(ex.Message) ? ex.Message : "Parámetros de solicitud inválidos.",
            UnauthorizedAccessException => "Acceso no autorizado.",
            KeyNotFoundException => "Recurso no encontrado.",
            _ => "Ocurrió un error al procesar tu solicitud."
        };
    }

    private static int GetStatusCode(Exception exception)
    {
        return exception switch
        {
            ArgumentException => (int)HttpStatusCode.BadRequest,
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            InvalidOperationException => (int)HttpStatusCode.BadRequest,
            _ => (int)HttpStatusCode.InternalServerError
        };
    }
}