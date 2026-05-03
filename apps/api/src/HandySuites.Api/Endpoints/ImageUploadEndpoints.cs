using HandySuites.Application.CompanySettings.Interfaces;
using HandySuites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HandySuites.Api.Endpoints;

public static class ImageUploadEndpoints
{
    // SECURITY (audit MED): magic byte validation. Antes confiábamos en
    // file.ContentType (cliente-supplied) — un atacante podía declarar
    // `image/png` y subir un SVG con <script>. Cloudinary mostly mitiga
    // pero defense-in-depth en backend es trivial. SVG explícitamente
    // rechazado: aunque sea "imagen", es XML ejecutable en browsers.
    private static bool ValidateImageMagicBytes(byte[] bytes, out string detectedFormat)
    {
        detectedFormat = "unknown";
        if (bytes.Length < 12) return false;

        // JPEG: FF D8 FF
        if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) { detectedFormat = "jpeg"; return true; }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
            && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A)
        { detectedFormat = "png"; return true; }
        // GIF: 47 49 46 38 (GIF8)
        if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38) { detectedFormat = "gif"; return true; }
        // WebP: RIFF....WEBP
        if (bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
            && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
        { detectedFormat = "webp"; return true; }

        return false;
    }

    private static async Task<bool> ValidateMagicBytesFromFormFileAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        var header = new byte[12];
        var read = await stream.ReadAsync(header.AsMemory(0, 12));
        if (read < 12) return false;
        return ValidateImageMagicBytes(header, out _);
    }

    private static bool ValidateMagicBytesFromBase64(string base64DataUri)
    {
        // base64 data URI: "data:image/png;base64,iVBORw0KGgo..."
        var commaIdx = base64DataUri.IndexOf(',');
        var b64 = commaIdx > 0 ? base64DataUri[(commaIdx + 1)..] : base64DataUri;
        // Solo necesitamos los primeros 16 bytes — base64 de 16 bytes ≈ 24 chars
        var prefix = b64.Length > 24 ? b64[..24] : b64;
        try
        {
            var bytes = Convert.FromBase64String(prefix);
            return ValidateImageMagicBytes(bytes, out _);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public static void MapImageUploadEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/images")
            .RequireAuthorization();

        // Upload avatar de usuario
        group.MapPost("/avatar", async (
            IFormFile file,
            ICloudinaryService cloudinaryService,
            HandySuitesDbContext dbContext,
            ClaimsPrincipal user) =>
        {
            try
            {
                var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                {
                    return Results.BadRequest("Usuario no válido");
                }

                // Limit file size to 5MB
                if (file.Length > 5 * 1024 * 1024)
                    return Results.BadRequest(new { error = "El archivo no debe superar 5MB" });

                // Validate content type (declared) Y magic bytes (real)
                var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
                if (!allowedTypes.Contains(file.ContentType?.ToLower()))
                    return Results.BadRequest(new { error = "Tipo de imagen no permitido. Use JPEG, PNG, GIF o WebP." });
                if (!await ValidateMagicBytesFromFormFileAsync(file))
                    return Results.BadRequest(new { error = "El archivo no es una imagen válida (JPEG/PNG/GIF/WebP)." });

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
                return Results.Problem("Error al subir imagen");
            }
        })
        .DisableAntiforgery();

        // Upload logo de empresa
        group.MapPost("/company-logo", [Authorize(Roles = "ADMIN,SUPER_ADMIN")] async (
            IFormFile file,
            ICloudinaryService cloudinaryService,
            HandySuitesDbContext dbContext,
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

                // Validate content type (declared) Y magic bytes (real)
                var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
                if (!allowedTypes.Contains(file.ContentType?.ToLower()))
                    return Results.BadRequest(new { error = "Tipo de imagen no permitido. Use JPEG, PNG, GIF o WebP." });
                if (!await ValidateMagicBytesFromFormFileAsync(file))
                    return Results.BadRequest(new { error = "El archivo no es una imagen válida (JPEG/PNG/GIF/WebP)." });

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

                // Actualizar logo en CompanySetting (no en Tenant)
                var companySetting = await dbContext.CompanySettings
                    .FirstOrDefaultAsync(cs => cs.TenantId == tenantId);
                if (companySetting != null)
                {
                    if (!string.IsNullOrEmpty(companySetting.LogoPublicId))
                    {
                        await cloudinaryService.DeleteImageAsync(companySetting.LogoPublicId);
                    }
                    companySetting.LogoUrl = result.SecureUrl;
                    companySetting.LogoPublicId = result.PublicId;
                }
                await dbContext.SaveChangesAsync();

                return Results.Ok(new { url = result.SecureUrl });
            }
            catch (Exception ex)
            {
                return Results.Problem("Error al subir logo");
            }
        })
        .DisableAntiforgery();

        // Upload imagen desde base64 (para compatibilidad con el frontend)
        group.MapPost("/upload-base64", async (
            Base64ImageRequest request,
            ICloudinaryService cloudinaryService,
            HandySuitesDbContext dbContext,
            ClaimsPrincipal user) =>
        {
            try
            {
                if (string.IsNullOrEmpty(request.Base64Image) || request.Base64Image.Length > 7_000_000) // ~5MB decoded
                    return Results.BadRequest(new { error = "La imagen no debe superar 5MB" });

                // Validate MIME type from data URI
                var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
                if (!string.IsNullOrEmpty(request.Base64Image) && request.Base64Image.StartsWith("data:"))
                {
                    var mimeEnd = request.Base64Image.IndexOf(';');
                    if (mimeEnd > 5)
                    {
                        var mime = request.Base64Image.Substring(5, mimeEnd - 5);
                        if (!allowedTypes.Contains(mime))
                            return Results.BadRequest(new { error = "Tipo de imagen no permitido. Use JPEG, PNG, GIF o WebP." });
                    }
                }

                // SECURITY: validar magic bytes del payload base64 — antes solo
                // confiábamos en el MIME declarado, que el cliente controla.
                if (!ValidateMagicBytesFromBase64(request.Base64Image))
                    return Results.BadRequest(new { error = "El archivo no es una imagen válida (JPEG/PNG/GIF/WebP)." });

                // Validate upload type
                var allowedUploadTypes = new[] { "avatar", "logo", "product", "company" };
                if (!string.IsNullOrEmpty(request.Type) && !allowedUploadTypes.Contains(request.Type.ToLower()))
                    return Results.BadRequest(new { error = "Tipo de carga no válido." });

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

                // SECURITY: gate logo/company uploads a ADMIN+. Antes el upload
                // a Cloudinary procedía y solo el DB write se gateaba — un
                // VENDEDOR podía spamear /logos/ con 5MB cada uno (storage abuse).
                if ((request.Type == "logo" || request.Type == "company") && !usuario.IsAdminOrAbove)
                    return Results.Forbid();

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
                else if (request.Type == "logo" && usuario.IsAdminOrAbove)
                {
                    var companySetting = await dbContext.CompanySettings
                        .FirstOrDefaultAsync(cs => cs.TenantId == usuario.TenantId);
                    if (companySetting != null)
                    {
                        if (!string.IsNullOrEmpty(companySetting.LogoPublicId))
                        {
                            await cloudinaryService.DeleteImageAsync(companySetting.LogoPublicId);
                        }
                        companySetting.LogoUrl = result.SecureUrl;
                        companySetting.LogoPublicId = result.PublicId;
                        await dbContext.SaveChangesAsync();
                    }
                }

                return Results.Ok(new { url = result.SecureUrl });
            }
            catch (Exception ex)
            {
                return Results.Problem("Error al subir imagen");
            }
        });

        // Obtener información de imágenes del usuario actual
        group.MapGet("/user-images", async (
            HandySuitesDbContext dbContext,
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

            var companySetting = await dbContext.CompanySettings
                .AsNoTracking()
                .FirstOrDefaultAsync(cs => cs.TenantId == usuario.TenantId);

            return Results.Ok(new
            {
                avatarUrl = usuario.AvatarUrl,
                companyLogoUrl = companySetting?.LogoUrl,
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