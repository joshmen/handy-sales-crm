using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

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
            return result is null ? Results.Unauthorized() : Results.Ok(result);
        });

        app.MapPost("/auth/refresh", async (RefreshTokenDto dto, [FromServices] AuthService auth) =>
        {
            var result = await auth.RefreshTokenAsync(dto.RefreshToken);
            return result is null ? Results.Unauthorized() : Results.Ok(result);
        });

        app.MapPost("/auth/logout", (HttpContext context, [FromServices] AuthService auth) =>
        {
            // En una implementación real, aquí invalidarías el token
            return Results.Ok(new { message = "Logout exitoso" });
        }).RequireAuthorization();

    }
}