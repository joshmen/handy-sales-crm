using HandySuites.Shared.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace HandySuites.Api.Configuration;

public static class JwtExtensions
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        var jwtSettings = config.GetSection("Jwt").Get<JwtSettings>() ?? throw new InvalidOperationException("No se encontró la configuración JWT.");

        // C-1 / M-8: Fail fast on weak or missing JWT configuration.
        // The Production override mechanism still works because env var `Jwt__Secret`
        // overrides the empty placeholder in appsettings.json before this check runs.
        if (string.IsNullOrWhiteSpace(jwtSettings.Secret) || jwtSettings.Secret.Length < 32)
            throw new InvalidOperationException("JWT Secret must be at least 32 characters. Configure Jwt:Secret env var or appsettings.");
        if (string.IsNullOrWhiteSpace(jwtSettings.Issuer) || string.IsNullOrWhiteSpace(jwtSettings.Audience))
            throw new InvalidOperationException("JWT Issuer and Audience must be configured.");

        var key = Encoding.UTF8.GetBytes(jwtSettings.Secret);

        services.Configure<JwtSettings>(config.GetSection("Jwt"));

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            // H-5: Issuer/Audience validation must always be ON, even in Development.
            // Previously a Development-conditional disabled both, allowing tokens issued
            // by foreign systems to be accepted in dev builds.
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            };

            // SignalR: WebSocket cannot send Authorization headers,
            // so JWT is passed via ?access_token= query string for /hubs paths
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        return services;
    }
}
