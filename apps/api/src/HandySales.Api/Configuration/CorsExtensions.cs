namespace HandySales.Api.Configuration;

public static class CorsExtensions
{
    public static IServiceCollection AddCustomCors(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("HandySalesPolicy", builder =>
            {
                var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
                
                if (environment == "Development")
                {
                    // Desarrollo: Permitir cualquier origen localhost
                    builder
                        .SetIsOriginAllowed(origin =>
                            origin.Contains("localhost") ||
                            origin.Contains("127.0.0.1"))
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()
                        .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
                }
                else
                {
                    // Producción: Orígenes específicos más restrictivos
                    var allowedOrigins = configuration.GetSection("CORS:AllowedOrigins").Get<string[]>() ?? new[]
                    {
                        "https://handysales.vercel.app",    // Frontend principal
                        "https://handysales.com",           // Dominio custom
                        "https://www.handysales.com",       // Dominio custom con www
                        "https://*.vercel.app"              // Cualquier deployment de Vercel
                    };

                    builder
                        .WithOrigins(allowedOrigins)
                        .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .WithHeaders("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With")
                        .AllowCredentials()
                        .SetPreflightMaxAge(TimeSpan.FromHours(1));
                }
            });

            // Política más restrictiva para endpoints administrativos
            options.AddPolicy("AdminPolicy", builder =>
            {
                builder
                    .WithOrigins(
                        "http://localhost:3000",
                        "https://localhost:3000",
                        "https://handysales.vercel.app"
                    )
                    .WithMethods("GET", "POST", "PUT", "DELETE")
                    .WithHeaders("Authorization", "Content-Type")
                    .AllowCredentials();
            });
        });

        return services;
    }
}