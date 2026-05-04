using HandySuites.Application.CompanySettings.Interfaces;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Imaging;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HandySuites.Mobile.Api.Endpoints;

/// <summary>
/// Endpoints de perfil del usuario logueado desde mobile. Hoy expone
/// upload + delete de avatar. El sync hacia el authStore se hace via
/// `useMe` hook del cliente mobile (refetch al volver al foreground).
///
/// Espejo del flujo `POST /api/images/avatar` en el main API pero scoped
/// a la mobile API: misma host, mismo CORS, mismo JWT issuer. Evita que
/// el cliente mobile tenga que conocer la URL del main API solo para esto.
/// </summary>
public static class MobileProfileEndpoints
{
    public static void MapMobileProfileEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/profile")
            .WithTags("Profile")
            .WithOpenApi()
            .RequireAuthorization();

        // POST /api/mobile/profile/avatar — multipart upload
        group.MapPost("/avatar", async (
            IFormFile file,
            [FromServices] ICloudinaryService cloudinary,
            [FromServices] HandySuitesDbContext db,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            // Tamaño + content-type declarado
            if (file == null || file.Length == 0)
                return Results.BadRequest(new { error = "Archivo vacío" });
            if (file.Length > ImageUploadHelpers.MaxAvatarBytes)
                return Results.BadRequest(new { error = "El archivo no debe superar 5MB" });
            if (!ImageUploadHelpers.AllowedAvatarContentTypes.Contains(file.ContentType?.ToLower() ?? ""))
                return Results.BadRequest(new { error = "Tipo de imagen no permitido. Use JPEG, PNG, GIF o WebP." });

            // Defense-in-depth: magic bytes reales (no confiar en content-type del cliente)
            await using (var stream = file.OpenReadStream())
            {
                var header = new byte[12];
                var read = await stream.ReadAsync(header.AsMemory(0, 12));
                if (read < 12 || !ImageUploadHelpers.ValidateImageMagicBytes(header, out _))
                    return Results.BadRequest(new { error = "El archivo no es una imagen válida (JPEG/PNG/GIF/WebP)." });
            }

            var usuario = await db.Usuarios
                .Include(u => u.Tenant)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (usuario == null)
                return Results.NotFound(new { error = "Usuario no encontrado" });

            // Subir a {tenantFolder}/avatars
            var tenantFolder = cloudinary.GenerateTenantFolder(usuario.TenantId, usuario.Tenant.NombreEmpresa);
            var avatarFolder = $"{tenantFolder}/avatars";

            var result = await cloudinary.UploadImageAsync(file, avatarFolder);
            if (!result.IsSuccess)
                return Results.BadRequest(new { error = result.ErrorMessage ?? "Error al subir imagen" });

            // Borrar avatar anterior (si existía) — best-effort, no falla la request
            if (!string.IsNullOrEmpty(usuario.AvatarUrl))
            {
                var oldPublicId = ImageUploadHelpers.ExtractPublicIdFromCloudinaryUrl(usuario.AvatarUrl);
                if (!string.IsNullOrEmpty(oldPublicId))
                {
                    await cloudinary.DeleteImageAsync(oldPublicId);
                }
            }

            usuario.AvatarUrl = result.SecureUrl;
            await db.SaveChangesAsync();

            return Results.Ok(new { success = true, data = new { avatarUrl = result.SecureUrl } });
        })
        .DisableAntiforgery()
        .WithSummary("Subir foto de perfil del usuario logueado")
        .WithDescription("Multipart upload con campo `file`. Valida magic bytes + 5MB cap + JPEG/PNG/GIF/WebP. Sube a Cloudinary `{tenant}/avatars/`, borra el anterior si existía, y actualiza `Usuario.AvatarUrl` en DB.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        // DELETE /api/mobile/profile/avatar — quita la foto y limpia Cloudinary
        group.MapDelete("/avatar", async (
            [FromServices] ICloudinaryService cloudinary,
            [FromServices] HandySuitesDbContext db,
            HttpContext context) =>
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Results.Unauthorized();

            var usuario = await db.Usuarios
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (usuario == null)
                return Results.NotFound(new { error = "Usuario no encontrado" });

            if (!string.IsNullOrEmpty(usuario.AvatarUrl))
            {
                var oldPublicId = ImageUploadHelpers.ExtractPublicIdFromCloudinaryUrl(usuario.AvatarUrl);
                if (!string.IsNullOrEmpty(oldPublicId))
                {
                    await cloudinary.DeleteImageAsync(oldPublicId);
                }
            }

            usuario.AvatarUrl = null;
            await db.SaveChangesAsync();

            return Results.Ok(new { success = true, data = new { avatarUrl = (string?)null } });
        })
        .WithSummary("Quitar foto de perfil")
        .WithDescription("Borra la imagen de Cloudinary y setea `Usuario.AvatarUrl = null`.")
        .Produces<object>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);
    }
}
