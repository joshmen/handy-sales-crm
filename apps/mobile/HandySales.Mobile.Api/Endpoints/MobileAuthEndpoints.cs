using HandySales.Application.Usuarios.DTOs;
using HandySales.Application.Auth.DTOs;
using HandySales.Mobile.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HandySales.Mobile.Api.Endpoints;

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
                return Results.Unauthorized();
            }

            return Results.Ok(new
            {
                success = true,
                data = result.Data,
                deviceRegistered = !string.IsNullOrEmpty(deviceId)
            });
        })
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
        .WithSummary("Refrescar token")
        .WithDescription("Obtiene un nuevo access token usando el refresh token.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/logout", (HttpContext context) =>
        {
            return Results.Ok(new { success = true, message = "Sesión cerrada exitosamente" });
        })
        .RequireAuthorization()
        .WithSummary("Cerrar sesión")
        .WithDescription("Cierra la sesión del vendedor en el dispositivo móvil.")
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
