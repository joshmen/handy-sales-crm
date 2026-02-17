namespace HandySales.Mobile.Api.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", () => Results.Ok(new
        {
            status = "healthy",
            service = "HandySales.Mobile.Api",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        }))
        .WithTags("Health")
        .WithSummary("Health check")
        .WithDescription("Verifica que la API móvil está funcionando correctamente.")
        .Produces<object>(StatusCodes.Status200OK);

        app.MapGet("/health/ready", () => Results.Ok(new
        {
            status = "ready",
            service = "HandySales.Mobile.Api",
            timestamp = DateTime.UtcNow
        }))
        .WithTags("Health")
        .WithSummary("Readiness check")
        .WithDescription("Verifica que la API está lista para recibir tráfico.")
        .Produces<object>(StatusCodes.Status200OK);

        app.MapGet("/api/mobile/version", () => Results.Ok(new
        {
            success = true,
            data = new
            {
                api = "HandySales.Mobile.Api",
                version = "1.0.0",
                minAppVersion = "1.0.0",
                latestAppVersion = "1.0.0",
                updateRequired = false,
                features = new[]
                {
                    "pedidos",
                    "visitas",
                    "rutas",
                    "sync_offline",
                    "gps_tracking"
                }
            }
        }))
        .WithTags("Health")
        .WithSummary("Información de versión")
        .WithDescription("Retorna información de versión de la API y requerimientos de la app móvil.")
        .Produces<object>(StatusCodes.Status200OK);
    }
}
