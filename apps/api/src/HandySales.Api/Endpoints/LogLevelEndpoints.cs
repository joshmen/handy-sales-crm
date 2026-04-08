using HandySuites.Api.Configuration;
using Serilog.Events;

namespace HandySuites.Api.Endpoints;

public static class LogLevelEndpoints
{
    public static void MapLogLevelEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/superadmin/log-level")
            .RequireAuthorization()
            .WithTags("Monitoring");

        group.MapGet("/", (HttpContext context) =>
        {
            var role = context.User.FindFirst("role")?.Value
                ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (role != "SUPER_ADMIN") return Results.Forbid();

            return Results.Ok(new { level = LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel.ToString() });
        });

        group.MapPost("/", (LogLevelRequest req, HttpContext context) =>
        {
            var role = context.User.FindFirst("role")?.Value
                ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (role != "SUPER_ADMIN") return Results.Forbid();

            if (Enum.TryParse<LogEventLevel>(req.Level, true, out var level))
            {
                LoggingExtensions.CloudWatchLevelSwitch.MinimumLevel = level;
                return Results.Ok(new { level = level.ToString(), message = $"Log level changed to {level}" });
            }
            return Results.BadRequest(new { error = "Invalid level. Use: Warning, Information, or Debug" });
        });
    }
}

public class LogLevelRequest
{
    public string Level { get; set; } = "";
}
