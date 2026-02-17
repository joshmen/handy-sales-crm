namespace HandySales.Mobile.Api.Configuration;

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
                    // Producción: Orígenes específicos para apps móviles
                    var allowedOrigins = configuration.GetSection("CORS:AllowedOrigins").Get<string[]>() ?? new[]
                    {
                        "https://handysales.com",
                        "https://api.handysales.com",
                        "capacitor://localhost",          // Capacitor/Ionic apps
                        "ionic://localhost",              // Ionic apps
                        "http://localhost"                // React Native debug
                    };

                    builder
                        .WithOrigins(allowedOrigins)
                        .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .WithHeaders("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-Device-Id", "X-App-Version")
                        .SetPreflightMaxAge(TimeSpan.FromHours(1));
                }
            });
        });

        return services;
    }
}
