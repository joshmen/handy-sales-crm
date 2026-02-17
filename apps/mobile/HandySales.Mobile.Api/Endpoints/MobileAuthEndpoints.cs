using HandySales.Application.Usuarios.DTOs;
using HandySales.Application.Auth.DTOs;
using HandySales.Mobile.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

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

            var result = await auth.LoginAsync(dto.email, dto.password);
            if (result is null)
                return Results.Unauthorized();

            var deviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault();
            var appVersion = context.Request.Headers["X-App-Version"].FirstOrDefault();

            return Results.Ok(new
            {
                success = true,
                data = result,
                deviceRegistered = !string.IsNullOrEmpty(deviceId)
            });
        })
        .WithSummary("Login de vendedor móvil")
        .WithDescription("Autentica un vendedor y devuelve tokens JWT. Incluir headers X-Device-Id y X-App-Version para tracking.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

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
    }
}
