using HandySales.Application.GlobalSettings.DTOs;
using HandySales.Application.GlobalSettings.Services;
using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Api.Endpoints
{
    public static class GlobalSettingsEndpoints
    {
        public static void MapGlobalSettingsEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/global-settings")
                .RequireAuthorization()
                .WithTags("Global Settings");

            // GET /api/global-settings
            group.MapGet("/", async (
                [FromServices] IGlobalSettingsService globalSettingsService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    var result = await globalSettingsService.GetSettingsAsync();
                    
                    if (result == null)
                    {
                        return Results.NotFound("Configuración global no encontrada");
                    }

                    // Si es SUPER_ADMIN, devolver información completa
                    if (currentTenant.IsSuperAdmin)
                    {
                        return Results.Ok(result);
                    }

                    // Para usuarios autenticados no-SUPER_ADMIN, devolver solo información básica
                    var publicInfo = new
                    {
                        result.Id,
                        result.PlatformName,
                        result.PlatformLogo,
                        result.PlatformPrimaryColor,
                        result.PlatformSecondaryColor,
                        result.DefaultLanguage,
                        result.DefaultTimezone,
                        result.MaintenanceMode,
                        result.MaintenanceMessage,
                        result.UpdatedAt
                    };

                    return Results.Ok(publicInfo);
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("GetGlobalSettings")
            .WithSummary("Obtener configuración global de la plataforma")
            .WithDescription("Solo accesible para SUPER_ADMIN")
            .Produces<GlobalSettingsDto>();

            // PUT /api/global-settings
            group.MapPut("/", async (
                UpdateGlobalSettingsDto request,
                HttpContext context,
                [FromServices] IGlobalSettingsService globalSettingsService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    if (!currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var userIdClaim = context.User.FindFirst("userId")?.Value
                                    ?? context.User.FindFirst("sub")?.Value
                                    ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    
                    if (!int.TryParse(userIdClaim, out var userId))
                    {
                        return Results.Unauthorized();
                    }

                    var result = await globalSettingsService.UpdateSettingsAsync(userId, request);

                    return result != null 
                        ? Results.Ok(result) 
                        : Results.NotFound("Configuración global no encontrada");
                }
                catch (Exception ex)
                {
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("UpdateGlobalSettings")
            .WithSummary("Actualizar configuración global de la plataforma")
            .WithDescription("Solo accesible para SUPER_ADMIN")
            .Accepts<UpdateGlobalSettingsDto>("application/json")
            .Produces<GlobalSettingsDto>();


            // POST /api/global-settings/upload-logo - Basado en ImageUploadEndpoints
            group.MapPost("/upload-logo", async (
                IFormFile logo,
                ICloudinaryService cloudinaryService,
                HandySalesDbContext dbContext,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    // Solo SUPER_ADMIN puede subir logo de la plataforma
                    if (!currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    if (logo == null || logo.Length == 0)
                    {
                        return Results.BadRequest(new { error = "No se proporcionó ningún archivo" });
                    }

                    // Validar archivo
                    if (logo.Length > 5 * 1024 * 1024) // 5MB
                    {
                        return Results.BadRequest(new { error = "El archivo es demasiado grande. Máximo 5MB." });
                    }

                    var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif" };
                    if (!allowedTypes.Contains(logo.ContentType.ToLower()))
                    {
                        return Results.BadRequest(new { error = "Tipo de archivo no soportado. Solo se permiten imágenes." });
                    }

                    // Obtener configuración global actual
                    var globalSettings = await dbContext.GlobalSettings.FirstOrDefaultAsync();
                    if (globalSettings == null)
                    {
                        return Results.NotFound("Configuración global no encontrada");
                    }

                    // Eliminar logo anterior si existe usando la función de ImageUploadEndpoints
                    if (!string.IsNullOrEmpty(globalSettings.PlatformLogo))
                    {
                        var oldPublicId = ExtractPublicIdFromUrl(globalSettings.PlatformLogo);
                        if (!string.IsNullOrEmpty(oldPublicId))
                        {
                            await cloudinaryService.DeleteImageAsync(oldPublicId);
                        }
                    }

                    // Subir nuevo logo a carpeta de plataforma
                    var result = await cloudinaryService.UploadImageAsync(logo, "platform/logos");

                    if (!result.IsSuccess)
                    {
                        return Results.BadRequest(new { error = result.ErrorMessage });
                    }

                    // Actualizar configuración global
                    globalSettings.PlatformLogo = result.SecureUrl;
                    globalSettings.PlatformLogoPublicId = result.PublicId;
                    globalSettings.UpdatedBy = currentTenant.UserId;

                    await dbContext.SaveChangesAsync();

                    return Results.Ok(new { logoUrl = result.SecureUrl });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error al subir logo de plataforma: {ex.Message}");
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("UploadPlatformLogo")
            .WithSummary("Subir logo de la plataforma")
            .WithDescription("Solo accesible para SUPER_ADMIN")
            .DisableAntiforgery()
            .Accepts<IFormFile>("multipart/form-data")
            .Produces<object>();

            // DELETE /api/global-settings/delete-logo
            group.MapDelete("/delete-logo", async (
                HandySalesDbContext dbContext,
                ICloudinaryService cloudinaryService,
                [FromServices] ICurrentTenant currentTenant) =>
            {
                try
                {
                    if (!currentTenant.IsSuperAdmin)
                    {
                        return Results.Forbid();
                    }

                    var globalSettings = await dbContext.GlobalSettings.FirstOrDefaultAsync();
                    if (globalSettings == null)
                    {
                        return Results.NotFound("Configuración global no encontrada");
                    }

                    // Eliminar de Cloudinary si existe
                    if (!string.IsNullOrEmpty(globalSettings.PlatformLogo))
                    {
                        var publicId = ExtractPublicIdFromUrl(globalSettings.PlatformLogo);
                        if (!string.IsNullOrEmpty(publicId))
                        {
                            await cloudinaryService.DeleteImageAsync(publicId);
                        }
                    }

                    // Limpiar campos de logo
                    globalSettings.PlatformLogo = null;
                    globalSettings.PlatformLogoPublicId = null;
                    globalSettings.UpdatedBy = currentTenant.UserId;

                    await dbContext.SaveChangesAsync();

                    return Results.Ok(new { message = "Logo eliminado correctamente" });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error al eliminar logo de plataforma: {ex.Message}");
                    return Results.Problem($"Error interno del servidor: {ex.Message}");
                }
            })
            .WithName("DeletePlatformLogo")
            .WithSummary("Eliminar logo de la plataforma")
            .WithDescription("Solo accesible para SUPER_ADMIN")
            .Produces<object>();
        }

        // Función copiada de ImageUploadEndpoints para extraer public_id
        private static string ExtractPublicIdFromUrl(string url)
        {
            try
            {
                var uri = new Uri(url);
                var segments = uri.AbsolutePath.Split('/');
                
                var uploadIndex = Array.IndexOf(segments, "upload");
                if (uploadIndex == -1 || uploadIndex >= segments.Length - 1)
                    return string.Empty;

                var fileWithExt = segments[segments.Length - 1];
                var lastDotIndex = fileWithExt.LastIndexOf('.');
                
                if (lastDotIndex > 0)
                {
                    var publicIdPart = fileWithExt.Substring(0, lastDotIndex);
                    
                    var folderParts = new List<string>();
                    for (int i = uploadIndex + 1; i < segments.Length - 1; i++)
                    {
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
    }
}