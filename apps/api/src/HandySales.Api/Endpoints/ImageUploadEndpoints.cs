using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HandySales.Api.Endpoints;

public static class ImageUploadEndpoints
{
    public static void MapImageUploadEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/images")
            .RequireAuthorization();

        // Upload avatar de usuario
        group.MapPost("/avatar", async (
            IFormFile file,
            ICloudinaryService cloudinaryService,
            HandySalesDbContext dbContext,
            ClaimsPrincipal user) =>
        {
            try
            {
                var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                {
                    return Results.BadRequest("Usuario no válido");
                }

                var usuario = await dbContext.Usuarios
                    .Include(u => u.Tenant)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (usuario == null)
                {
                    return Results.NotFound("Usuario no encontrado");
                }

                // Generar carpeta del tenant si no existe
                var tenantFolder = cloudinaryService.GenerateTenantFolder(usuario.TenantId, usuario.Tenant.NombreEmpresa);
                var avatarFolder = $"{tenantFolder}/avatars";

                // Subir imagen
                var result = await cloudinaryService.UploadImageAsync(file, avatarFolder);

                if (!result.IsSuccess)
                {
                    return Results.BadRequest(result.ErrorMessage);
                }

                // Eliminar avatar anterior si existe
                if (!string.IsNullOrEmpty(usuario.AvatarUrl))
                {
                    // Extraer public_id de la URL anterior
                    var oldPublicId = ExtractPublicIdFromUrl(usuario.AvatarUrl);
                    if (!string.IsNullOrEmpty(oldPublicId))
                    {
                        await cloudinaryService.DeleteImageAsync(oldPublicId);
                    }
                }

                // Actualizar URL del avatar
                usuario.AvatarUrl = result.SecureUrl;
                await dbContext.SaveChangesAsync();

                return Results.Ok(new { url = result.SecureUrl });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error al subir imagen: {ex.Message}");
            }
        })
        .DisableAntiforgery();

        // Upload logo de empresa
        group.MapPost("/company-logo", [Authorize(Roles = "ADMIN,SUPER_ADMIN")] async (
            IFormFile file,
            ICloudinaryService cloudinaryService,
            HandySalesDbContext dbContext,
            ClaimsPrincipal user) =>
        {
            try
            {
                var tenantIdClaim = user.FindFirst("TenantId")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !int.TryParse(tenantIdClaim, out var tenantId))
                {
                    return Results.BadRequest("Tenant no válido");
                }

                var tenant = await dbContext.Tenants.FindAsync(tenantId);
                if (tenant == null)
                {
                    return Results.NotFound("Empresa no encontrada");
                }

                // Generar/usar carpeta del tenant
                var tenantFolder = cloudinaryService.GenerateTenantFolder(tenantId, tenant.NombreEmpresa);
                
                // Crear carpeta si no existe
                if (string.IsNullOrEmpty(tenant.CloudinaryFolder))
                {
                    await cloudinaryService.CreateFolderAsync(tenantFolder);
                    tenant.CloudinaryFolder = tenantFolder;
                }

                var logoFolder = $"{tenantFolder}/logos";

                // Subir imagen
                var result = await cloudinaryService.UploadImageAsync(file, logoFolder);

                if (!result.IsSuccess)
                {
                    return Results.BadRequest(result.ErrorMessage);
                }

                // Eliminar logo anterior si existe
                if (!string.IsNullOrEmpty(tenant.LogoUrl))
                {
                    var oldPublicId = ExtractPublicIdFromUrl(tenant.LogoUrl);
                    if (!string.IsNullOrEmpty(oldPublicId))
                    {
                        await cloudinaryService.DeleteImageAsync(oldPublicId);
                    }
                }

                // Actualizar URL del logo
                tenant.LogoUrl = result.SecureUrl;
                await dbContext.SaveChangesAsync();

                return Results.Ok(new { url = result.SecureUrl });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error al subir logo: {ex.Message}");
            }
        })
        .DisableAntiforgery();

        // Upload imagen desde base64 (para compatibilidad con el frontend)
        group.MapPost("/upload-base64", async (
            Base64ImageRequest request,
            ICloudinaryService cloudinaryService,
            HandySalesDbContext dbContext,
            ClaimsPrincipal user) =>
        {
            try
            {
                var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                {
                    return Results.BadRequest("Usuario no válido");
                }

                var usuario = await dbContext.Usuarios
                    .Include(u => u.Tenant)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (usuario == null)
                {
                    return Results.NotFound("Usuario no encontrado");
                }

                var tenantFolder = cloudinaryService.GenerateTenantFolder(usuario.TenantId, usuario.Tenant.NombreEmpresa);
                var folder = $"{tenantFolder}/{request.Type}s"; // avatars, logos, etc.

                // Subir imagen desde base64
                var result = await cloudinaryService.UploadImageFromBase64Async(
                    request.Base64Image, 
                    folder, 
                    $"{request.Type}_{userId}_{DateTime.UtcNow.Ticks}");

                if (!result.IsSuccess)
                {
                    return Results.BadRequest(result.ErrorMessage);
                }

                // Actualizar la URL según el tipo
                if (request.Type == "avatar")
                {
                    // Eliminar avatar anterior
                    if (!string.IsNullOrEmpty(usuario.AvatarUrl))
                    {
                        var oldPublicId = ExtractPublicIdFromUrl(usuario.AvatarUrl);
                        if (!string.IsNullOrEmpty(oldPublicId))
                        {
                            await cloudinaryService.DeleteImageAsync(oldPublicId);
                        }
                    }

                    usuario.AvatarUrl = result.SecureUrl;
                    await dbContext.SaveChangesAsync();
                }
                else if (request.Type == "logo" && (usuario.EsAdmin || usuario.EsSuperAdmin))
                {
                    var tenant = await dbContext.Tenants.FindAsync(usuario.TenantId);
                    if (tenant != null)
                    {
                        // Eliminar logo anterior
                        if (!string.IsNullOrEmpty(tenant.LogoUrl))
                        {
                            var oldPublicId = ExtractPublicIdFromUrl(tenant.LogoUrl);
                            if (!string.IsNullOrEmpty(oldPublicId))
                            {
                                await cloudinaryService.DeleteImageAsync(oldPublicId);
                            }
                        }

                        tenant.LogoUrl = result.SecureUrl;
                        await dbContext.SaveChangesAsync();
                    }
                }

                return Results.Ok(new { url = result.SecureUrl });
            }
            catch (Exception ex)
            {
                return Results.Problem($"Error al subir imagen: {ex.Message}");
            }
        });

        // Obtener información de imágenes del usuario actual
        group.MapGet("/user-images", async (
            HandySalesDbContext dbContext,
            ClaimsPrincipal user) =>
        {
            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Results.BadRequest("Usuario no válido");
            }

            var usuario = await dbContext.Usuarios
                .Include(u => u.Tenant)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (usuario == null)
            {
                return Results.NotFound("Usuario no encontrado");
            }

            return Results.Ok(new
            {
                avatarUrl = usuario.AvatarUrl,
                companyLogoUrl = usuario.Tenant.LogoUrl,
                cloudinaryFolder = usuario.Tenant.CloudinaryFolder
            });
        });
    }

    private static string ExtractPublicIdFromUrl(string url)
    {
        try
        {
            // Extraer el public_id de una URL de Cloudinary
            // Formato típico: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{extension}
            var uri = new Uri(url);
            var segments = uri.AbsolutePath.Split('/');
            
            // Buscar el índice de "upload"
            var uploadIndex = Array.IndexOf(segments, "upload");
            if (uploadIndex == -1 || uploadIndex >= segments.Length - 1)
                return string.Empty;

            // El public_id está después de "upload" (y posibles transformaciones)
            var fileWithExt = segments[segments.Length - 1];
            var lastDotIndex = fileWithExt.LastIndexOf('.');
            
            if (lastDotIndex > 0)
            {
                var publicIdPart = fileWithExt.Substring(0, lastDotIndex);
                
                // Incluir la estructura de carpetas
                var folderParts = new List<string>();
                for (int i = uploadIndex + 1; i < segments.Length - 1; i++)
                {
                    // Saltar transformaciones (v123456, etc.)
                    if (!segments[i].StartsWith("v") || !int.TryParse(segments[i].Substring(1), out _))
                    {
                        folderParts.Add(segments[i]);
                    }
                }
                
                if (folderParts.Count > 0)
                {
                    return string.Join("/", folderParts) + "/" + publicIdPart;
                }
                
                return publicIdPart;
            }
            
            return string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    public record Base64ImageRequest(string Base64Image, string Type);
}