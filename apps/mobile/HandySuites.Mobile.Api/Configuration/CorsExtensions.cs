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
                    // Desarrollo: localhost + emulator + Expo Go LAN ranges.
                    // Antes era AllowAnyOrigin — un dev visitando un sitio
                    // malicioso con localhost:1052 corriendo permitía exfil
                    // de datos locales. Audit MED.
                    builder
                        .SetIsOriginAllowed(origin =>
                        {
                            if (string.IsNullOrEmpty(origin)) return false;
                            if (origin == "capacitor://localhost") return true;
                            if (origin == "ionic://localhost") return true;
                            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
                            // localhost variants
                            if (uri.Host == "localhost" || uri.Host == "127.0.0.1") return true;
                            // Android emulator host
                            if (uri.Host == "10.0.2.2") return true;
                            // LAN IPs típicas del dev box
                            if (uri.Host.StartsWith("192.168.") || uri.Host.StartsWith("10.")
                                || uri.Host.StartsWith("172.")) return true;
                            return false;
                        })
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
