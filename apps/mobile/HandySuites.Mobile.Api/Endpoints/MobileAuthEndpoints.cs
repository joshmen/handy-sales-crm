using HandySuites.Application.Usuarios.DTOs;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileAuthEndpoints
{
    public static void MapMobileAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/auth")
            .WithTags("Auth")
            .WithOpenApi();

        group.MapPost("/login", async (
            UsuarioLoginDto dto,
            IValidator<UsuarioLoginDto> validator,
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var validation = await validator.ValidateAsync(dto);
            if (!validation.IsValid)
                return Results.BadRequest(new { success = false, errors = validation.ToDictionary() });

            var deviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault();
            var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

            var result = await auth.LoginAsync(dto.email, dto.password, deviceId, deviceFingerprint);

            if (!result.Success)
            {
                if (result.DeviceBound)
                {
                    return Results.Json(new
                    {
                        success = false,
                        code = "DEVICE_BOUND",
                        message = result.Message
                    }, statusCode: 403);
                }

                if (!string.IsNullOrEmpty(result.Message))
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = result.Message
                    }, statusCode: 401);
                }

                return Results.Unauthorized();
            }

            return Results.Ok(new
            {
                success = true,
                data = result.Data,
                deviceRegistered = !string.IsNullOrEmpty(deviceId)
            });
        })
        .RequireRateLimiting("mobile-auth")
        .WithSummary("Login de vendedor móvil")
        .WithDescription("Autentica un vendedor y devuelve tokens JWT. Incluir headers X-Device-Id y X-Device-Fingerprint para device binding.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status403Forbidden);

        group.MapPost("/refresh", async (
            RefreshTokenDto dto,
            [FromServices] MobileAuthService auth) =>
        {
            var result = await auth.RefreshTokenAsync(dto.RefreshToken);
            if (result is null)
                return Results.Unauthorized();

            return Results.Ok(new { success = true, data = result });
        })
        .RequireRateLimiting("mobile-auth")
        .WithSummary("Refrescar token")
        .WithDescription("Obtiene un nuevo access token usando el refresh token.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/logout", async (
            LogoutRequest? request,
            [FromServices] HandySuitesDbContext db,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;

            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var userId))
            {
                // Revoke refresh token if provided (tokens are stored as SHA-256 hashes)
                if (!string.IsNullOrEmpty(request?.RefreshToken))
                {
                    var hash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(request.RefreshToken));
                    var tokenHash = Convert.ToBase64String(hash);
                    var token = await db.RefreshTokens
                        .FirstOrDefaultAsync(t => t.Token == tokenHash && !t.IsRevoked);
                    if (token != null)
                    {
                        token.IsRevoked = true;
                        token.RevokedAt = DateTime.UtcNow;
                    }
                }

                // Update device session status if fingerprint provided
                var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();
                if (!string.IsNullOrEmpty(deviceFingerprint))
                {
                    var session = await db.DeviceSessions
                        .IgnoreQueryFilters()
                        .Where(ds => ds.UsuarioId == userId
                                  && ds.DeviceFingerprint == deviceFingerprint
                                  && ds.EliminadoEn == null
                                  && ds.Status == SessionStatus.Active)
                        .OrderByDescending(ds => ds.LastActivity)
                        .FirstOrDefaultAsync();

                    if (session != null)
                    {
                        session.Status = SessionStatus.LoggedOut;
                        session.LoggedOutAt = DateTime.UtcNow;
                        session.LogoutReason = "user_logout";
                    }
                }

                await db.SaveChangesAsync();
            }

            return Results.Ok(new { success = true, message = "Sesión cerrada exitosamente" });
        })
        .RequireAuthorization()
        .WithSummary("Cerrar sesión")
        .WithDescription("Cierra la sesión del vendedor, revoca el refresh token y marca la sesión del dispositivo como cerrada.")
        .Produces<object>(StatusCodes.Status200OK);

        group.MapPost("/device-token", async (
            DeviceTokenDto dto,
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tenantIdClaim))
                return Results.Unauthorized();

            var userId = int.Parse(userIdClaim);
            var tenantId = int.Parse(tenantIdClaim);

            var deviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault();
            var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

            await auth.RegisterDeviceTokenAsync(userId, tenantId, dto.Token, dto.Platform, dto.DeviceName, deviceId, deviceFingerprint);

            return Results.Ok(new { success = true, message = "Token registrado" });
        })
        .RequireAuthorization()
        .WithSummary("Registrar push token del dispositivo")
        .WithDescription("Registra o actualiza el Expo Push Token para enviar notificaciones push al dispositivo.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/ack-unbind", async (
            [FromServices] MobileAuthService auth,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tenantIdClaim))
                return Results.Unauthorized();

            var userId = int.Parse(userIdClaim);
            var tenantId = int.Parse(tenantIdClaim);
            var deviceFingerprint = context.Request.Headers["X-Device-Fingerprint"].FirstOrDefault();

            await auth.AcknowledgeUnbindAsync(userId, tenantId, deviceFingerprint);

            return Results.Ok(new { success = true, message = "Dispositivo desvinculado exitosamente" });
        })
        .RequireAuthorization()
        .WithSummary("Confirmar desvinculacion de dispositivo")
        .WithDescription("El dispositivo confirma que sincronizo todos los datos y acepta la desvinculacion.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);
    }
}

public record DeviceTokenDto(string Token, string Platform, string DeviceName);

public class LogoutRequest
{
    public string? RefreshToken { get; set; }
}
