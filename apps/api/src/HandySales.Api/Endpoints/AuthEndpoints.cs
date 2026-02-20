using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace HandySales.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/auth/register", async (UsuarioRegisterDto dto, IValidator<UsuarioRegisterDto> validator, [FromServices] AuthService auth) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var ok = await auth.RegisterAsync(dto);
            return ok ? Results.Ok(new { message = "Usuario registrado" }) : Results.BadRequest(new { error = "Email ya existe" });
        });

        app.MapPost("/auth/login", async (UsuarioLoginDto dto, IValidator<UsuarioLoginDto> validator, [FromServices] AuthService auth) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var result = await auth.LoginAsync(dto);
            if (result is null)
                return Results.Unauthorized();

            // Check if this is an ACTIVE_SESSION_EXISTS response (409 Conflict)
            var resultType = result.GetType();
            var codeProp = resultType.GetProperty("code");
            if (codeProp != null && codeProp.GetValue(result)?.ToString() == "ACTIVE_SESSION_EXISTS")
                return Results.Conflict(result);

            // Check if 2FA is required (200 with requires2FA flag)
            var requires2FAProp = resultType.GetProperty("requires2FA");
            if (requires2FAProp != null && (bool)(requires2FAProp.GetValue(result) ?? false))
                return Results.Ok(result);

            return Results.Ok(result);
        });

        app.MapPost("/auth/verify-2fa", async (
            [FromBody] Verify2FADto dto,
            [FromServices] AuthService auth,
            IConfiguration config) =>
        {
            if (string.IsNullOrWhiteSpace(dto.TempToken) || string.IsNullOrWhiteSpace(dto.Code))
                return Results.BadRequest(new { error = "Se requiere tempToken y código" });

            // Validate and parse the temp token to extract userId
            var userId = ValidateTempToken(dto.TempToken, config);
            if (userId == null)
                return Results.Unauthorized();

            var result = await auth.Verify2FAAsync(userId.Value, dto.Code);
            if (result is null)
                return Results.BadRequest(new { error = "Código inválido" });

            // Check if force-login returned an error (2FA required for force-login)
            var resultType = result.GetType();
            var errorProp = resultType.GetProperty("error");
            if (errorProp != null)
                return Results.BadRequest(result);

            return Results.Ok(result);
        });

        app.MapPost("/auth/force-login", async (UsuarioLoginDto dto, IValidator<UsuarioLoginDto> validator, [FromServices] AuthService auth) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(validation.ToDictionary());

            var result = await auth.ForceLoginAsync(dto);
            if (result is null)
                return Results.Unauthorized();

            // Check if 2FA is required
            var resultType = result.GetType();
            var errorProp = resultType.GetProperty("error");
            if (errorProp != null && errorProp.GetValue(result)?.ToString() == "2FA_REQUIRED")
                return Results.BadRequest(result);

            return Results.Ok(result);
        });

        app.MapPost("/auth/refresh", async (RefreshTokenDto dto, [FromServices] AuthService auth) =>
        {
            var result = await auth.RefreshTokenAsync(dto.RefreshToken);
            return result is null ? Results.Unauthorized() : Results.Ok(result);
        });

        app.MapPost("/auth/logout", async (HttpContext context, [FromServices] AuthService auth, [FromBody] LogoutDto? dto) =>
        {
            var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                                 ?? context.User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            var success = await auth.LogoutAsync(userId, dto?.RefreshToken);
            return success
                ? Results.Ok(new { message = "Logout exitoso" })
                : Results.BadRequest(new { error = "No se pudo cerrar la sesión" });
        }).RequireAuthorization();

        // Social login — called from NextAuth server-side after OAuth verification
        // Protected by a shared secret to prevent unauthorized calls
        app.MapPost("/auth/social-login", async (
            [FromBody] SocialLoginDto dto,
            [FromServices] AuthService auth,
            [FromServices] IConfiguration config,
            HttpContext context) =>
        {
            // Verify shared secret (NextAuth server-side → backend)
            var expectedSecret = config["SocialLogin:SharedSecret"] ?? config["Jwt:Secret"];
            var providedSecret = context.Request.Headers["X-Social-Login-Secret"].FirstOrDefault();
            if (string.IsNullOrEmpty(providedSecret) || providedSecret != expectedSecret)
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Provider))
                return Results.BadRequest(new { error = "Se requiere email y provider" });

            var result = await auth.SocialLoginAsync(dto.Email, dto.Provider);
            if (result == null)
                return Results.BadRequest(new { error = "Usuario no registrado. Solo usuarios existentes pueden usar login social." });

            return Results.Ok(result);
        });
    }

    /// <summary>
    /// Validates a 2FA temp token and extracts the userId.
    /// </summary>
    private static int? ValidateTempToken(string tempToken, IConfiguration config)
    {
        try
        {
            var jwtSecret = config["Jwt:Secret"];
            if (string.IsNullOrEmpty(jwtSecret)) return null;

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(jwtSecret);

            var principal = tokenHandler.ValidateToken(tempToken, new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            }, out _);

            // Verify this is a 2FA temp token
            var is2FAPending = principal.FindFirstValue("2fa_pending");
            if (is2FAPending != "true" && is2FAPending != "True")
                return null;

            var userIdClaim = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                              ?? principal.FindFirstValue("sub");

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return null;

            return userId;
        }
        catch
        {
            return null;
        }
    }
}

public record LogoutDto(string? RefreshToken);
public record Verify2FADto(string TempToken, string Code);
public record SocialLoginDto(string Email, string Provider);
