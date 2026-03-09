using FluentValidation;
using HandySales.Application.Usuarios.Services;
using HandySales.Application.Usuarios.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;

namespace HandySales.Api.Endpoints;

public static class UserProfileEndpoints
{
    public static void MapUserProfileEndpoints(this WebApplication app)
    {
        var profile = app.MapGroup("/api/profile")
            .RequireAuthorization()
            .WithTags("User Profile");

        profile.MapGet("/", GetMyProfile)
            .WithName("GetMyProfile")
            .WithSummary("Obtener mi perfil de usuario");

        profile.MapPut("/", UpdateMyProfile)
            .WithName("UpdateMyProfile")
            .WithSummary("Actualizar mi perfil de usuario");

        profile.MapPost("/avatar", UploadMyAvatar)
            .WithName("UploadMyAvatar")
            .WithSummary("Subir mi avatar")
            .DisableAntiforgery();

        profile.MapDelete("/avatar", DeleteMyAvatar)
            .WithName("DeleteMyAvatar")
            .WithSummary("Eliminar mi avatar");
    }

    private static async Task<IResult> GetMyProfile(UsuarioService service)
    {
        try
        {
            var profile = await service.ObtenerMiPerfilAsync();
            if (profile == null)
                return Results.NotFound("Perfil de usuario no encontrado");

            return Results.Ok(profile);
        }
        catch (Exception ex)
        {
            return Results.Problem("Error al obtener perfil");
        }
    }

    private static async Task<IResult> UpdateMyProfile(
        UsuarioProfileUpdateDto dto,
        IValidator<UsuarioProfileUpdateDto> validator,
        UsuarioService service,
        IMemoryCache cache,
        HttpContext httpContext)
    {
        // Rate limit password change attempts: max 5 per minute per user
        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            var userId = httpContext.User.FindFirst("sub")?.Value ?? "unknown";
            var rateLimitKey = $"pwd_change_{userId}";
            var count = cache.GetOrCreate(rateLimitKey, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
                return 0;
            });
            if (count >= 5)
                return Results.Problem("Demasiados intentos de cambio de contraseña. Intenta en 1 minuto.", statusCode: 429);
            cache.Set(rateLimitKey, count + 1, TimeSpan.FromMinutes(1));
        }

        var validationResult = await validator.ValidateAsync(dto);
        if (!validationResult.IsValid)
            return Results.ValidationProblem(validationResult.ToDictionary());

        try
        {
            var success = await service.ActualizarMiPerfilAsync(dto);
            if (!success)
                return Results.NotFound("Perfil de usuario no encontrado");

            return Results.Ok(new { message = "Perfil actualizado correctamente" });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem("Error al actualizar perfil");
        }
    }

    private static async Task<IResult> UploadMyAvatar(HttpRequest request, UsuarioService service)
    {
        try
        {
            if (!request.HasFormContentType)
                return Results.BadRequest("Content-Type debe ser multipart/form-data");

            var form = await request.ReadFormAsync();
            var file = form.Files.FirstOrDefault();

            if (file == null || file.Length == 0)
                return Results.BadRequest("No se ha proporcionado ningún archivo");

            // Get current user ID from service context
            var profile = await service.ObtenerMiPerfilAsync();
            if (profile == null)
                return Results.NotFound("Perfil de usuario no encontrado");

            var avatarUrl = await service.UploadAvatarAsync(profile.Id, file);
            if (avatarUrl == null)
                return Results.BadRequest("Error al subir el avatar");

            return Results.Ok(new { avatarUrl });
        }
        catch (Exception ex)
        {
            return Results.Problem("Error al subir avatar");
        }
    }

    private static async Task<IResult> DeleteMyAvatar(UsuarioService service)
    {
        try
        {
            // Get current user ID from service context
            var profile = await service.ObtenerMiPerfilAsync();
            if (profile == null)
                return Results.NotFound("Perfil de usuario no encontrado");

            var success = await service.DeleteAvatarAsync(profile.Id);
            if (!success)
                return Results.BadRequest("Error al eliminar avatar");

            return Results.Ok(new { message = "Avatar eliminado correctamente" });
        }
        catch (Exception ex)
        {
            return Results.Problem("Error al eliminar avatar");
        }
    }
}