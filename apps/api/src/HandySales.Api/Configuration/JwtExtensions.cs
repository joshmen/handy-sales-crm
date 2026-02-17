using HandySales.Shared.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;

namespace HandySales.Api.Configuration;

public static class JwtExtensions
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        var jwtSettings = config.GetSection("Jwt").Get<JwtSettings>() ?? throw new InvalidOperationException("No se encontró la configuración JWT.");
        var key = Encoding.ASCII.GetBytes(jwtSettings.Secret);

        services.Configure<JwtSettings>(config.GetSection("Jwt"));

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            // In development, allow mock tokens
            var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
            
            
            if (isDevelopment)
            {
                // Completely bypass JWT validation in development
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
                        
                        // Extract token from Authorization header manually in development
                        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                        
                        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                        {
                            var token = authHeader.Substring("Bearer ".Length);
                            context.Token = token;
                            
                            try
                            {
                                // Parse the actual JWT token to extract real claims
                                var tokenHandler = new JwtSecurityTokenHandler();
                                var jsonToken = tokenHandler.ReadJwtToken(token);
                                
                                // Extract claims from the actual JWT token
                                var claims = new List<Claim>();
                                foreach (var claim in jsonToken.Claims)
                                {
                                    claims.Add(new Claim(claim.Type, claim.Value));
                                }
                                
                                // Ensure we have the standard NameIdentifier claim
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
                                Console.WriteLine($"Development mode: Failed to parse JWT token: {ex.Message}");
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
                        Console.WriteLine($"Development mode: Authentication failed: {context.Exception?.Message}");
                        return Task.CompletedTask;
                    },
                    
                    OnChallenge = context =>
                    {
                        Console.WriteLine("Development mode: OnChallenge called");
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
