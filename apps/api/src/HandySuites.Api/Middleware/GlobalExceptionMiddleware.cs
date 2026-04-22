using System.Net;
using System.Text.Json;

namespace HandySuites.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IWebHostEnvironment _env;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IWebHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var statusCode = GetStatusCode(ex);

            // 4xx exceptions are expected outcomes of business-rule enforcement (e.g. stock
            // insuficiente, validation, auth). Log them at a lower level so dashboards and
            // alerting don't page on normal user mistakes. Only genuine 5xx errors are surfaced
            // as "Unhandled exception" at Error level.
            if (statusCode >= 400 && statusCode < 500)
            {
                _logger.LogInformation(
                    "Business-rule rejection: {ExceptionType} on {Method} {Path}: {Message}",
                    ex.GetType().Name, context.Request.Method, context.Request.Path, ex.Message);
            }
            else
            {
                _logger.LogError(ex, "Unhandled exception occurred. Request: {Method} {Path}",
                    context.Request.Method, context.Request.Path);
            }

            await HandleExceptionAsync(context, ex, statusCode, _env);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception, int statusCode, IWebHostEnvironment env)
    {
        context.Response.ContentType = "application/json; charset=utf-8";

        var response = new
        {
            Success = false,
            Message = GetErrorMessage(exception, env, statusCode),
            Data = (object?)null
        };

        context.Response.StatusCode = statusCode;

        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }

    private static string GetErrorMessage(Exception exception, IWebHostEnvironment env, int statusCode)
    {
        // DbUpdateConcurrencyException tiene un mensaje EF-interno que no es útil para el usuario;
        // usamos mensaje custom siempre.
        if (exception is Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
        {
            return "Conflicto de concurrencia: el recurso fue modificado por otra operación. Vuelve a intentarlo.";
        }

        // 4xx: the exception.Message is a user-facing business-rule error ("Stock insuficiente:…"),
        // so return it verbatim even in production — the frontend needs it to show an actionable toast.
        // 5xx: return generic messages to avoid leaking internals.
        if (statusCode >= 400 && statusCode < 500 && !string.IsNullOrEmpty(exception.Message))
        {
            return exception.Message;
        }

        return exception switch
        {
            InvalidOperationException ex => env.IsDevelopment() && !string.IsNullOrEmpty(ex.Message)
                ? ex.Message : "No se pudo completar la operación.",
            ArgumentException ex => env.IsDevelopment() && !string.IsNullOrEmpty(ex.Message)
                ? ex.Message : "Parámetros de solicitud inválidos.",
            UnauthorizedAccessException => "Acceso no autorizado.",
            KeyNotFoundException => "Recurso no encontrado.",
            Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException => "Conflicto de concurrencia: el recurso fue modificado por otra operación. Vuelve a intentarlo.",
            _ => "Ocurrió un error al procesar tu solicitud."
        };
    }

    private static int GetStatusCode(Exception exception)
    {
        return exception switch
        {
            ArgumentException => (int)HttpStatusCode.BadRequest,
            // Usuario autenticado pero sin permisos para la acción → 403 Forbidden (no 401).
            UnauthorizedAccessException => (int)HttpStatusCode.Forbidden,
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            InvalidOperationException => (int)HttpStatusCode.BadRequest,
            // Body JSON malformado / vacío / nulo: System.Text.Json / BadHttpRequestException.
            System.Text.Json.JsonException => (int)HttpStatusCode.BadRequest,
            Microsoft.AspNetCore.Http.BadHttpRequestException => (int)HttpStatusCode.BadRequest,
            // Concurrencia optimistic: el cliente debería reintentar.
            Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException => (int)HttpStatusCode.Conflict,
            _ => (int)HttpStatusCode.InternalServerError
        };
    }
}
