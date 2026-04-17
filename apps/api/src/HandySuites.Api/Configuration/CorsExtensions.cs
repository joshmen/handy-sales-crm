namespace HandySuites.Api.Configuration;

public static class CorsExtensions
{
    public static IServiceCollection AddCustomCors(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("HandySuitesPolicy", builder =>
            {
                var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
                
                if (environment == "Development")
                {
                    // Desarrollo: Solo puertos localhost conocidos
                    builder
                        .WithOrigins(
                            "http://localhost:1083",  // Next.js dev
                            "http://localhost:3000",  // Next.js alt
                            "http://localhost:5173",  // Vite
                            "http://127.0.0.1:1083")
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()
                        .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
                }
                else
                {
                    // Producción: Solo dominios propios (no wildcard *.vercel.app)
                    var allowedVercelHost = Environment.GetEnvironmentVariable("CORS_VERCEL_HOST")
                        ?? "handy-sales-crm.vercel.app";

                    builder
                        .SetIsOriginAllowed(origin =>
                        {
                            var uri = new Uri(origin);
                            return uri.Host == allowedVercelHost ||
                                   uri.Host == "handysuites.com" ||
                                   uri.Host.EndsWith(".handysuites.com");
                        })
                        .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .AllowAnyHeader()
                        .AllowCredentials()
                        .SetPreflightMaxAge(TimeSpan.FromHours(1));
                }
            });

            // Política restrictiva para endpoints administrativos (SuperAdmin)
            options.AddPolicy("AdminPolicy", builder =>
            {
                var adminVercelHost = Environment.GetEnvironmentVariable("CORS_VERCEL_HOST")
                    ?? "handy-sales-crm.vercel.app";

                builder
                    .SetIsOriginAllowed(origin =>
                    {
                        if (origin == "http://localhost:1083") return true;
                        if (origin == $"https://{adminVercelHost}") return true;
                        var uri = new Uri(origin);
                        return uri.Host == "handysuites.com" || uri.Host.EndsWith(".handysuites.com");
                    })
                    .WithMethods("GET", "POST", "PUT", "DELETE")
                    .WithHeaders("Authorization", "Content-Type")
                    .AllowCredentials();
            });
        });

        return services;
    }
}