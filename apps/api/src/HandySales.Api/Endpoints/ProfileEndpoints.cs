using HandySales.Application.Usuarios.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace HandySales.Api.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        var profile = app.MapGroup("/api/profile")
            .RequireAuthorization()
            .WithTags("User Profile");

        // POST /api/profile/avatar - Upload user avatar
        profile.MapPost("/avatar", async (
            HttpContext context,
            UsuarioService usuarioService) =>
        {
            try
            {
                var form = await context.Request.ReadFormAsync();
                var file = form.Files["avatar"];

                if (file == null || file.Length == 0)
                {
                    return Results.BadRequest(new { error = "No se proporcionó ningún archivo" });
                }

                // Obtener el ID del usuario actual del token (usar 'sub' claim)
                var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? context.User.FindFirst("sub")?.Value;
                if (!int.TryParse(userIdClaim, out var userId))
                {
                    return Results.Unauthorized();
                }

                var avatarUrl = await usuarioService.UploadAvatarAsync(userId, file);
                
                return avatarUrl != null 
                    ? Results.Ok(new { avatarUrl }) 
                    : Results.BadRequest(new { error = "No se pudo subir el avatar" });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error interno del servidor: {ex.Message}");
            }
        })
        .WithName("UploadAvatar")
        .WithSummary("Subir avatar del usuario")
        .Accepts<IFormFile>("multipart/form-data")
        .Produces<object>(200)
        .Produces(400)
        .Produces(401);

        // DELETE /api/profile/avatar - Delete user avatar
        profile.MapDelete("/avatar", async (
            HttpContext context,
            UsuarioService usuarioService) =>
        {
            try
            {
                // Obtener el ID del usuario actual del token (usar 'sub' claim)
                var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? context.User.FindFirst("sub")?.Value;
                if (!int.TryParse(userIdClaim, out var userId))
                {
                    return Results.Unauthorized();
                }

                var success = await usuarioService.DeleteAvatarAsync(userId);
                
                return success 
                    ? Results.Ok(new { message = "Avatar eliminado exitosamente" }) 
                    : Results.BadRequest(new { error = "No se pudo eliminar el avatar" });
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Forbid();
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error interno del servidor: {ex.Message}");
            }
        })
        .WithName("DeleteAvatar")
        .WithSummary("Eliminar avatar del usuario")
        .Produces<object>(200)
        .Produces(400)
        .Produces(401);

        // GET /api/profile - Get current user profile
        profile.MapGet("/", async (
            HttpContext context,
            UsuarioService usuarioService) =>
        {
            try
            {
                // Obtener el ID del usuario actual del token (usar 'sub' claim)
                var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? context.User.FindFirst("sub")?.Value;
                
                if (!int.TryParse(userIdClaim, out var userId))
                {
                    return Results.Unauthorized();
                }

                var user = await usuarioService.ObtenerUsuarioPorIdAsync(userId);
                
                return user != null 
                    ? Results.Ok(user) 
                    : Results.NotFound(new { error = "Usuario no encontrado" });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error interno del servidor: {ex.Message}");
            }
        })
        .WithName("GetProfile")
        .WithSummary("Obtener perfil del usuario actual")
        .Produces<object>(200)
        .Produces(401)
        .Produces(404);
    }
}