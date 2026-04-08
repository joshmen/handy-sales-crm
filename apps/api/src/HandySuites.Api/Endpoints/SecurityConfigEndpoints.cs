using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;

namespace HandySuites.Api.Endpoints;

public static class SecurityConfigEndpoints
{
    public static void MapSecurityConfigEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/security-config")
            .RequireAuthorization()
            .WithTags("Security Config");

        // GET /api/admin/security-config
        group.MapGet("/", ([FromServices] ICurrentTenant currentTenant) =>
        {
            if (!currentTenant.IsSuperAdmin)
            {
                return Results.Forbid();
            }

            var config = new
            {
                rateLimiting = new object[]
                {
                    new { policyName = "Anonymous", limit = 15, windowSeconds = 60, description = "Endpoints de autenticación (login, registro, forgot-password)", api = "Main API" },
                    new { policyName = "Authenticated", limit = 120, windowSeconds = 60, description = "Endpoints autenticados (por usuario)", api = "Main API" },
                    new { policyName = "Global Fallback", limit = 200, windowSeconds = 60, description = "Límite global por IP", api = "Main API" },
                    new { policyName = "Global", limit = 120, windowSeconds = 60, description = "Límite global por IP", api = "Mobile API" }
                },
                authentication = new
                {
                    jwtExpirationMinutes = 60,
                    refreshTokenExpirationDays = 30,
                    passwordMinLength = 8,
                    twoFactorEnabled = true,
                    hashingAlgorithm = "SHA-256"
                },
                sessions = new
                {
                    deviceBinding = true,
                    sessionVersionValidation = true,
                    singleSessionPerDevice = true
                }
            };

            return Results.Ok(config);
        })
        .WithName("GetSecurityConfig")
        .WithSummary("Obtener configuración de seguridad actual")
        .WithDescription("Solo accesible para SUPER_ADMIN. Devuelve la configuración actual de rate limiting, autenticación y sesiones.")
        .Produces<object>(200)
        .ProducesProblem(401)
        .ProducesProblem(403);
    }
}
