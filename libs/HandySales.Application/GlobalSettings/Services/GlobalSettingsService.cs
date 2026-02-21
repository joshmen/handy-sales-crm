using HandySales.Application.GlobalSettings.DTOs;
using HandySales.Application.GlobalSettings.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Application.Common.Interfaces;
using HandySales.Application.CompanySettings.Interfaces;
using Microsoft.AspNetCore.Http;

namespace HandySales.Application.GlobalSettings.Services
{
    public interface IGlobalSettingsService
    {
        Task<GlobalSettingsDto?> GetSettingsAsync();
        Task<GlobalSettingsDto?> UpdateSettingsAsync(int userId, UpdateGlobalSettingsDto request);
        Task<UploadPlatformLogoResponse?> UploadPlatformLogoAsync(int userId, IFormFile file);
        Task<bool> DeletePlatformLogoAsync(int userId);
    }

    public class GlobalSettingsService : IGlobalSettingsService
    {
        private readonly IGlobalSettingsRepository _repository;
        private readonly HandySales.Application.CompanySettings.Interfaces.ICloudinaryService _cloudinaryService;
        private readonly ICloudinaryFolderService _folderService;

        public GlobalSettingsService(
            IGlobalSettingsRepository repository,
            HandySales.Application.CompanySettings.Interfaces.ICloudinaryService cloudinaryService,
            ICloudinaryFolderService folderService)
        {
            _repository = repository;
            _cloudinaryService = cloudinaryService;
            _folderService = folderService;
        }

        public async Task<GlobalSettingsDto?> GetSettingsAsync()
        {
            try
            {
                var settings = await _repository.GetAsync();
                
                if (settings == null)
                {
                    // Crear configuración global por defecto si no existe
                    settings = new Domain.Entities.GlobalSettings
                    {
                        PlatformName = "Handy Suites",
                        PlatformPrimaryColor = "#3B82F6",
                        PlatformSecondaryColor = "#8B5CF6",
                        DefaultLanguage = "es",
                        DefaultTimezone = "America/Mexico_City",
                        AllowSelfRegistration = false,
                        RequireEmailVerification = true,
                        MaintenanceMode = false
                    };
                    
                    settings = await _repository.CreateAsync(settings);
                }

                return new GlobalSettingsDto
                {
                    Id = settings.Id,
                    PlatformName = settings.PlatformName,
                    PlatformLogo = settings.PlatformLogo,
                    PlatformPrimaryColor = settings.PlatformPrimaryColor,
                    PlatformSecondaryColor = settings.PlatformSecondaryColor,
                    DefaultLanguage = settings.DefaultLanguage,
                    DefaultTimezone = settings.DefaultTimezone,
                    AllowSelfRegistration = settings.AllowSelfRegistration,
                    RequireEmailVerification = settings.RequireEmailVerification,
                    MaxUsersPerCompany = settings.MaxUsersPerCompany,
                    MaxStoragePerCompany = settings.MaxStoragePerCompany,
                    MaintenanceMode = settings.MaintenanceMode,
                    MaintenanceMessage = settings.MaintenanceMessage,
                    UpdatedAt = settings.UpdatedAt,
                    UpdatedBy = settings.UpdatedBy
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener configuración global: {ex.Message}");
                return null;
            }
        }

        public async Task<GlobalSettingsDto?> UpdateSettingsAsync(int userId, UpdateGlobalSettingsDto request)
        {
            try
            {
                var settings = await _repository.GetAsync();
                
                if (settings == null)
                {
                    return null;
                }

                // Actualizar solo los campos que se proporcionan
                if (!string.IsNullOrEmpty(request.PlatformName))
                    settings.PlatformName = request.PlatformName;

                if (!string.IsNullOrEmpty(request.PlatformLogo))
                    settings.PlatformLogo = request.PlatformLogo;

                if (!string.IsNullOrEmpty(request.PlatformPrimaryColor))
                    settings.PlatformPrimaryColor = request.PlatformPrimaryColor;

                if (!string.IsNullOrEmpty(request.PlatformSecondaryColor))
                    settings.PlatformSecondaryColor = request.PlatformSecondaryColor;

                if (!string.IsNullOrEmpty(request.DefaultLanguage))
                    settings.DefaultLanguage = request.DefaultLanguage;

                if (!string.IsNullOrEmpty(request.DefaultTimezone))
                    settings.DefaultTimezone = request.DefaultTimezone;

                if (request.AllowSelfRegistration.HasValue)
                    settings.AllowSelfRegistration = request.AllowSelfRegistration.Value;

                if (request.RequireEmailVerification.HasValue)
                    settings.RequireEmailVerification = request.RequireEmailVerification.Value;

                if (request.MaxUsersPerCompany.HasValue)
                    settings.MaxUsersPerCompany = request.MaxUsersPerCompany.Value;

                if (request.MaxStoragePerCompany.HasValue)
                    settings.MaxStoragePerCompany = request.MaxStoragePerCompany.Value;

                if (request.MaintenanceMode.HasValue)
                    settings.MaintenanceMode = request.MaintenanceMode.Value;

                if (request.MaintenanceMessage != null)
                    settings.MaintenanceMessage = request.MaintenanceMessage;

                settings.UpdatedBy = userId.ToString();

                var updatedSettings = await _repository.UpdateAsync(settings);

                return new GlobalSettingsDto
                {
                    Id = updatedSettings.Id,
                    PlatformName = updatedSettings.PlatformName,
                    PlatformLogo = updatedSettings.PlatformLogo,
                    PlatformPrimaryColor = updatedSettings.PlatformPrimaryColor,
                    PlatformSecondaryColor = updatedSettings.PlatformSecondaryColor,
                    DefaultLanguage = updatedSettings.DefaultLanguage,
                    DefaultTimezone = updatedSettings.DefaultTimezone,
                    AllowSelfRegistration = updatedSettings.AllowSelfRegistration,
                    RequireEmailVerification = updatedSettings.RequireEmailVerification,
                    MaxUsersPerCompany = updatedSettings.MaxUsersPerCompany,
                    MaxStoragePerCompany = updatedSettings.MaxStoragePerCompany,
                    MaintenanceMode = updatedSettings.MaintenanceMode,
                    MaintenanceMessage = updatedSettings.MaintenanceMessage,
                    UpdatedAt = updatedSettings.UpdatedAt,
                    UpdatedBy = updatedSettings.UpdatedBy
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al actualizar configuración global: {ex.Message}");
                return null;
            }
        }

        public async Task<UploadPlatformLogoResponse?> UploadPlatformLogoAsync(int userId, IFormFile file)
        {
            try
            {
                var settings = await _repository.GetAsync();
                
                if (settings == null)
                {
                    return null;
                }

                // Validar archivo
                if (file.Length > 5 * 1024 * 1024) // 5MB
                {
                    throw new ArgumentException("El archivo es demasiado grande. Máximo 5MB.");
                }

                var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif" };
                if (!allowedTypes.Contains(file.ContentType.ToLower()))
                {
                    throw new ArgumentException("Tipo de archivo no soportado. Solo se permiten imágenes.");
                }

                // Eliminar logo anterior si existe
                if (!string.IsNullOrEmpty(settings.PlatformLogoPublicId))
                {
                    await _cloudinaryService.DeleteImageAsync(settings.PlatformLogoPublicId);
                }

                // Obtener carpeta específica para logos de plataforma
                var logoFolder = _folderService.GetLogoFolder("platform");

                // Subir nueva imagen
                var uploadResult = await _cloudinaryService.UploadImageAsync(file, logoFolder);

                if (!uploadResult.IsSuccess)
                {
                    return null;
                }

                // Actualizar configuración
                settings.PlatformLogo = uploadResult.SecureUrl;
                settings.PlatformLogoPublicId = uploadResult.PublicId;
                settings.UpdatedBy = userId.ToString();

                await _repository.UpdateAsync(settings);

                return new UploadPlatformLogoResponse
                {
                    LogoUrl = settings.PlatformLogo
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al subir logo de plataforma: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> DeletePlatformLogoAsync(int userId)
        {
            try
            {
                var settings = await _repository.GetAsync();
                
                if (settings == null || string.IsNullOrEmpty(settings.PlatformLogo))
                {
                    return false;
                }

                // Eliminar imagen de Cloudinary si tiene PublicId
                if (!string.IsNullOrEmpty(settings.PlatformLogoPublicId))
                {
                    await _cloudinaryService.DeleteImageAsync(settings.PlatformLogoPublicId);
                }

                // Limpiar campos de logo
                settings.PlatformLogo = null;
                settings.PlatformLogoPublicId = null;
                settings.UpdatedBy = userId.ToString();

                await _repository.UpdateAsync(settings);

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al eliminar logo de plataforma: {ex.Message}");
                return false;
            }
        }
    }
}