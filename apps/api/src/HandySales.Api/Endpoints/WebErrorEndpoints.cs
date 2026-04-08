namespace HandySuites.Api.Endpoints;

public static class WebErrorEndpoints
{
    public static void MapWebErrorEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/web-errors", (WebErrorDto dto, ILogger<WebErrorDto> logger) =>
        {
            logger.LogError("WEB_ERROR at {Url}: {Message}\nUserAgent: {UserAgent}\nStack: {Stack}",
                dto.Url, dto.Message, dto.UserAgent, dto.Stack);
            return Results.Ok(new { received = true });
        })
        .AllowAnonymous()
        .RequireRateLimiting("anonymous")
        .WithTags("Monitoring");
    }
}

public record WebErrorDto(string Message, string? Stack, string? Url, string? UserAgent, string? Timestamp);
