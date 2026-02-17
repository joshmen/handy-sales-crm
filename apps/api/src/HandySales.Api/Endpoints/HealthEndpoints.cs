using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HandySales.Infrastructure.Persistence;
using System.Reflection;
using Microsoft.AspNetCore.OpenApi;

namespace HandySales.Api.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var healthGroup = app.MapGroup("/health")
            .WithTags("Health Checks")
            .WithOpenApi();

        // Health check básico (sin autenticación)
        healthGroup.MapGet("/", () => Results.Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            service = "HandySales API Principal",
            version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0"
        }))
        .WithName("GetHealth")
        .WithSummary("Health check básico")
        .Produces<object>(200);

        // Health check detallado (requiere autenticación)
        healthGroup.MapGet("/detailed", [Authorize] async (
            HandySalesDbContext dbContext,
            IConfiguration configuration) =>
        {
            var healthInfo = new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                service = "HandySales API Principal",
                version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0",
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown",

                database = await CheckDatabaseHealth(dbContext),

                configuration = new
                {
                    jwtConfigured = !string.IsNullOrEmpty(configuration["JWT:SecretKey"]),
                    multitenancyEnabled = !string.IsNullOrEmpty(configuration["Multitenancy:DefaultTenantId"]),
                    cloudinaryConfigured = !string.IsNullOrEmpty(configuration["Cloudinary:CloudName"])
                },

                system = new
                {
                    machineName = Environment.MachineName,
                    osVersion = Environment.OSVersion.ToString(),
                    processorCount = Environment.ProcessorCount,
                    workingSet = Environment.WorkingSet,
                    gcMemory = GC.GetTotalMemory(false),
                    uptime = Environment.TickCount64
                }
            };

            return Results.Ok(healthInfo);
        })
        .WithName("GetDetailedHealth")
        .WithSummary("Health check detallado (requiere autenticación)")
        .Produces<object>(200)
        .ProducesProblem(401);

        // Readiness check para Kubernetes/Docker
        healthGroup.MapGet("/ready", async (HandySalesDbContext dbContext) =>
        {
            try
            {
                // Verificar que la base de datos esté disponible
                await dbContext.Database.OpenConnectionAsync();
                await dbContext.Database.CloseConnectionAsync();

                return Results.Ok(new
                {
                    status = "ready",
                    timestamp = DateTime.UtcNow,
                    checks = new
                    {
                        database = "healthy"
                    }
                });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    title: "Service not ready",
                    detail: $"Database connection failed: {ex.Message}",
                    statusCode: 503
                );
            }
        })
        .WithName("GetReadiness")
        .WithSummary("Readiness check para contenedores")
        .Produces<object>(200)
        .ProducesProblem(503);

        // Liveness check para Kubernetes/Docker
        healthGroup.MapGet("/live", () => Results.Ok(new
        {
            status = "alive",
            timestamp = DateTime.UtcNow
        }))
        .WithName("GetLiveness")
        .WithSummary("Liveness check para contenedores")
        .Produces<object>(200);
    }

    private static async Task<object> CheckDatabaseHealth(HandySalesDbContext dbContext)
    {
        try
        {
            var startTime = DateTime.UtcNow;

            // Test básico de conexión
            await dbContext.Database.OpenConnectionAsync();
            var connectionTime = DateTime.UtcNow - startTime;

            // Test de query
            startTime = DateTime.UtcNow;
            var userCount = await dbContext.Usuarios.CountAsync();
            var queryTime = DateTime.UtcNow - startTime;

            await dbContext.Database.CloseConnectionAsync();

            return new
            {
                status = "healthy",
                connectionTimeMs = connectionTime.TotalMilliseconds,
                queryTimeMs = queryTime.TotalMilliseconds,
                totalUsers = userCount,
                provider = dbContext.Database.ProviderName,
                canConnect = true,
                canQuery = true
            };
        }
        catch (Exception ex)
        {
            return new
            {
                status = "unhealthy",
                error = ex.Message,
                canConnect = false,
                canQuery = false
            };
        }
    }
}