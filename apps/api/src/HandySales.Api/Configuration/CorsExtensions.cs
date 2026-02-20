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
                    // Producción: Permitir dominios propios + cualquier deploy de Vercel
                    builder
                        .SetIsOriginAllowed(origin =>
                        {
                            var uri = new Uri(origin);
                            return uri.Host.EndsWith(".vercel.app") ||
                                   uri.Host == "handysales.com" ||
                                   uri.Host == "www.handysales.com";
                        })
                        .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .AllowAnyHeader()
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