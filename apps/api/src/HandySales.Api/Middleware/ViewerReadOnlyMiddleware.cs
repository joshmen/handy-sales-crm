using System.Security.Claims;

namespace HandySales.Api.Middleware;

/// <summary>
/// Blocks non-read requests for users with the VIEWER role.
/// VIEWER can only perform GET/HEAD/OPTIONS requests on API endpoints.
/// </summary>
public class ViewerReadOnlyMiddleware
{
    private readonly RequestDelegate _next;

    private static readonly HashSet<string> ExcludedPrefixes = new(StringComparer.OrdinalIgnoreCase)
    {
        "/auth",
        "/api/2fa",
        "/health"
    };

    public ViewerReadOnlyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true &&
            context.User.IsInRole("VIEWER") &&
            !IsReadOnlyMethod(context.Request.Method) &&
            context.Request.Path.StartsWithSegments("/api") &&
            !IsExcluded(context.Request.Path))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"message\":\"El rol Viewer es de solo lectura\"}");
            return;
        }

        await _next(context);
    }

    private static bool IsReadOnlyMethod(string method)
        => HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method);

    private static bool IsExcluded(PathString path)
    {
        foreach (var prefix in ExcludedPrefixes)
        {
            if (path.StartsWithSegments(prefix))
                return true;
        }
        return false;
    }
}
