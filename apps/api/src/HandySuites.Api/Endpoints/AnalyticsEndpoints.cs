using System.Net.Http.Headers;
using System.Text.Json;
using HandySuites.Infrastructure.Persistence;

namespace HandySuites.Api.Endpoints;

/// <summary>
/// Proxy endpoint for Superset guest tokens.
/// The frontend calls this endpoint, and the API requests a guest token
/// from Superset on behalf of the user, injecting the tenant_id for RLS.
/// </summary>
public static class AnalyticsEndpoints
{
    private static readonly string SupersetUrl = Environment.GetEnvironmentVariable("SUPERSET_URL") ?? "http://superset:8088";
    private static readonly string SupersetUser = Environment.GetEnvironmentVariable("SUPERSET_ADMIN_USER") ?? "admin";
    private static readonly string SupersetPass = Environment.GetEnvironmentVariable("SUPERSET_ADMIN_PASSWORD") ?? "admin";

    public static void MapAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/analytics").RequireAuthorization();

        group.MapGet("/dashboards", HandleGetDashboards)
            .WithDescription("List available embedded dashboards");

        group.MapPost("/guest-token", HandleGetGuestToken)
            .WithDescription("Get a Superset guest token for the current tenant");
    }

    /// <summary>
    /// Returns the list of dashboards available for embedding.
    /// </summary>
    private static async Task<IResult> HandleGetDashboards(
        ITenantContextService tenantContext,
        HttpContext ctx)
    {
        try
        {
            using var client = new HttpClient();
            var token = await GetSupersetAccessToken(client);
            if (token == null) return Results.StatusCode(503);

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var response = await client.GetAsync($"{SupersetUrl}/api/v1/dashboard/?q=(page_size:50)");

            if (!response.IsSuccessStatusCode)
                return Results.StatusCode((int)response.StatusCode);

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            var dashboards = json.GetProperty("result").EnumerateArray()
                .Where(d => d.TryGetProperty("published", out var pub) && pub.GetBoolean())
                .Select(d => new
                {
                    id = d.GetProperty("id").GetInt32(),
                    title = d.GetProperty("dashboard_title").GetString(),
                    slug = d.TryGetProperty("slug", out var s) ? s.GetString() : null,
                    uuid = d.TryGetProperty("uuid", out var u) ? u.GetString() : null,
                })
                .ToList();

            return Results.Ok(dashboards);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error connecting to analytics service: {ex.Message}");
        }
    }

    /// <summary>
    /// Generates a Superset guest token with RLS filtering by tenant_id.
    /// The guest token ensures the user only sees data from their tenant.
    /// </summary>
    private static async Task<IResult> HandleGetGuestToken(
        ITenantContextService tenantContext,
        HttpContext ctx,
        GuestTokenRequest request)
    {
        var tenantId = tenantContext.TenantId;
        if (tenantId == 0) return Results.Unauthorized();

        var role = ctx.User.FindFirst("role")?.Value
                   ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

        // Only Admin and Supervisor can access analytics
        if (role != "ADMIN" && role != "SUPER_ADMIN" && role != "SUPERVISOR")
            return Results.Forbid();

        try
        {
            using var client = new HttpClient();
            var token = await GetSupersetAccessToken(client);
            if (token == null)
                return Results.StatusCode(503);

            // Request guest token from Superset
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var guestTokenPayload = new
            {
                user = new
                {
                    username = ctx.User.Identity?.Name ?? $"tenant_{tenantId}",
                    first_name = ctx.User.FindFirst("name")?.Value ?? "User",
                    last_name = "",
                },
                resources = request.DashboardIds.Select(id => new
                {
                    type = "dashboard",
                    id = id,
                }).ToArray(),
                rls = new[]
                {
                    new { clause = $"tenant_id = {tenantId}" }
                },
            };

            var response = await client.PostAsJsonAsync(
                $"{SupersetUrl}/api/v1/security/guest_token/", guestTokenPayload);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                return Results.Problem($"Failed to get guest token: {error}");
            }

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            var guestToken = result.GetProperty("token").GetString();

            return Results.Ok(new { token = guestToken });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error generating analytics token: {ex.Message}");
        }
    }

    /// <summary>
    /// Authenticate with Superset API and get an access token.
    /// </summary>
    private static async Task<string?> GetSupersetAccessToken(HttpClient client)
    {
        var loginPayload = new
        {
            username = SupersetUser,
            password = SupersetPass,
            provider = "db",
        };

        var response = await client.PostAsJsonAsync($"{SupersetUrl}/api/v1/security/login", loginPayload);
        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("access_token").GetString();
    }
}

public record GuestTokenRequest(List<string> DashboardIds);
