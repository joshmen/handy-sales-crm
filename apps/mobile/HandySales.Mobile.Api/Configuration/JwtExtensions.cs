using HandySales.Shared.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;

namespace HandySales.Mobile.Api.Configuration;

public static class JwtExtensions
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        var jwtSettings = config.GetSection("Jwt").Get<JwtSettings>()
            ?? throw new InvalidOperationException("No se encontró la configuración JWT.");
        var key = Encoding.ASCII.GetBytes(jwtSettings.Secret);

        services.Configure<JwtSettings>(config.GetSection("Jwt"));

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";

            if (isDevelopment)
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateIssuerSigningKey = false,
                    ValidateLifetime = false,
                    RequireSignedTokens = false,
                    RequireExpirationTime = false
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();

                        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                        {
                            var token = authHeader.Substring("Bearer ".Length);
                            context.Token = token;

                            try
                            {
                                var tokenHandler = new JwtSecurityTokenHandler();
                                var jsonToken = tokenHandler.ReadJwtToken(token);

                                var claims = new List<Claim>();
                                foreach (var claim in jsonToken.Claims)
                                {
                                    claims.Add(new Claim(claim.Type, claim.Value));
                                }

                                var subClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == "sub");
                                if (subClaim != null && !claims.Any(c => c.Type == ClaimTypes.NameIdentifier))
                                {
                                    claims.Add(new Claim(ClaimTypes.NameIdentifier, subClaim.Value));
                                }

                                var identity = new ClaimsIdentity(claims, "Bearer");
                                var principal = new ClaimsPrincipal(identity);
                                context.Principal = principal;
                                context.Success();
                                return Task.CompletedTask;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[Mobile API] Development mode: Failed to parse JWT token: {ex.Message}");
                                context.Fail("Invalid JWT token format");
                                return Task.CompletedTask;
                            }
                        }
                        else
                        {
                            context.Fail("No Authorization header found");
                        }

                        return Task.CompletedTask;
                    },

                    OnAuthenticationFailed = context =>
                    {
                        Console.WriteLine($"[Mobile API] Development mode: Authentication failed: {context.Exception?.Message}");
                        return Task.CompletedTask;
                    }
                };
            }
            else
            {
                // Production JWT validation
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtSettings.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateLifetime = true
                };
            }
        });

        return services;
    }
}
