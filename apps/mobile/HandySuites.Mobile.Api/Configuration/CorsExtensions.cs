namespace HandySuites.Mobile.Api.Configuration;

public static class CorsExtensions
{
    public static IServiceCollection AddCustomCors(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("MobilePolicy", builder =>
            {
                var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";

                if (environment == "Development")
                {
                    // Desarrollo: Permitir cualquier origen para pruebas móviles
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
                }
                else
                {
                    // Producción: handysuites.com + subdominios + esquemas mobile
                    builder
                        .SetIsOriginAllowed(origin =>
                        {
                            if (origin == "capacitor://localhost") return true;
                            if (origin == "ionic://localhost") return true;
                            if (origin == "http://localhost") return true;
                            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
                            return uri.Host == "handysuites.com" || uri.Host.EndsWith(".handysuites.com");
                        })
                        .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .WithHeaders("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-Device-Id", "X-Device-Fingerprint", "X-App-Version")
                        .SetPreflightMaxAge(TimeSpan.FromHours(1));
                }
            });
        });

        return services;
    }
}
