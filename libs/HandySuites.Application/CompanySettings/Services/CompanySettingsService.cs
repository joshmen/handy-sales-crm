using HandySuites.Application.CompanySettings.DTOs;
using HandySuites.Application.CompanySettings.Interfaces;
using HandySuites.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace HandySuites.Application.CompanySettings.Services
{
    public interface ICompanySettingsService
    {
        Task<CompanySettingsDto?> GetSettingsAsync(int tenantId);
        Task<CompanySettingsDto?> UpdateSettingsAsync(int tenantId, int userId, UpdateCompanySettingsRequest request);
        Task<UploadLogoResponse?> UploadLogoAsync(int tenantId, int userId, IFormFile file);
        Task<bool> DeleteLogoAsync(int tenantId, int userId);
    }

    public class CompanySettingsService : ICompanySettingsService
    {
        private readonly ICompanySettingsRepository _repository;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly ICloudinaryFolderService _folderService;
        private readonly ILogger<CompanySettingsService> _logger;

        public CompanySettingsService(
            ICompanySettingsRepository repository,
            ICloudinaryService cloudinaryService,
            ICloudinaryFolderService folderService,
            ILogger<CompanySettingsService> logger)
        {
            _repository = repository;
            _cloudinaryService = cloudinaryService;
            _folderService = folderService;
            _logger = logger;
        }

        public async Task<CompanySettingsDto?> GetSettingsAsync(int tenantId)
        {
            try
            {
                var settings = await _repository.GetByTenantIdAsync(tenantId);
                
                if (settings == null)
                {
                    // Crear configuración por defecto si no existe — usar nombre del tenant si disponible
                    var tenantForName = await _repository.GetTenantAsync(tenantId);
                    var defaultCompanyName = !string.IsNullOrWhiteSpace(tenantForName?.NombreEmpresa)
                        ? tenantForName.NombreEmpresa
                        : "Mi Empresa";
                    var cloudinaryFolder = _folderService.GenerateCompanyFolderName(tenantId, defaultCompanyName);
                    
                    settings = new CompanySetting
                    {
                        TenantId = tenantId,
                        CompanyName = defaultCompanyName,
                        PrimaryColor = "#3B82F6",
                        SecondaryColor = "#8B5CF6",
                        CloudinaryFolder = cloudinaryFolder
                    };
                    
                    // Crear estructura de carpetas en Cloudinary
                    await _folderService.EnsureFolderStructureAsync(cloudinaryFolder);
                    
                    settings = await _repository.CreateAsync(settings);
                }

                // Fetch tenant data for subscription info
                var tenant = await _repository.GetTenantAsync(tenantId);
                var activeUsers = await _repository.CountActiveUsersAsync(tenantId);

                return new CompanySettingsDto
                {
                    Id = settings.Id,
                    Name = settings.CompanyName,
                    Logo = settings.LogoUrl,
                    PrimaryColor = settings.PrimaryColor,
                    SecondaryColor = settings.SecondaryColor,
                    CloudinaryFolder = settings.CloudinaryFolder,
                    Timezone = settings.Timezone,
                    Currency = settings.Currency,
                    Language = settings.Language,
                    Theme = settings.Theme,
                    Country = settings.Country,
                    SubscriptionPlan = tenant?.PlanTipo ?? "Trial",
                    SubscriptionStatus = tenant?.SubscriptionStatus ?? "Trial",
                    MaxUsers = tenant?.MaxUsuarios,
                    CurrentUsers = activeUsers,
                    IsActive = tenant?.Activo ?? true,
                    UpdatedAt = settings.ActualizadoEn ?? settings.CreadoEn,
                    UpdatedBy = settings.ActualizadoPor,
                    TrialEndsAt = tenant?.TrialEndsAt,
                    DaysRemaining = tenant?.TrialEndsAt.HasValue == true
                        ? Math.Max(0, (int)(tenant.TrialEndsAt!.Value - DateTime.UtcNow).TotalDays)
                        : null,
                    HoraInicioJornada = settings.HoraInicioJornada.ToString("HH:mm"),
                    HoraFinJornada = settings.HoraFinJornada.ToString("HH:mm"),
                    DiasLaborables = settings.DiasLaborables,
                    ModoVentaDefault = settings.ModoVentaDefault,
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener configuración para tenant {TenantId}", tenantId);
                return null;
            }
        }

        public async Task<CompanySettingsDto?> UpdateSettingsAsync(int tenantId, int userId, UpdateCompanySettingsRequest request)
        {
            try
            {
                var settings = await _repository.GetByTenantIdAsync(tenantId);
                
                if (settings == null)
                {
                    return null;
                }

                // Actualizar solo los campos que se proporcionan
                if (!string.IsNullOrEmpty(request.Name))
                {
                    settings.CompanyName = request.Name;
                    
                    // Si se cambia el nombre de la empresa, regenerar la carpeta de Cloudinary
                    var newCloudinaryFolder = _folderService.GenerateCompanyFolderName(tenantId, request.Name);
                    settings.CloudinaryFolder = newCloudinaryFolder;
                    
                    // Asegurar que la nueva estructura de carpetas existe
                    await _folderService.EnsureFolderStructureAsync(newCloudinaryFolder);
                }

                if (!string.IsNullOrEmpty(request.PrimaryColor))
                    settings.PrimaryColor = request.PrimaryColor;

                if (!string.IsNullOrEmpty(request.SecondaryColor))
                    settings.SecondaryColor = request.SecondaryColor;

                if (!string.IsNullOrEmpty(request.Timezone))
                    settings.Timezone = request.Timezone;

                if (!string.IsNullOrEmpty(request.Language))
                    settings.Language = request.Language;

                if (!string.IsNullOrEmpty(request.Currency))
                    settings.Currency = request.Currency;

                if (!string.IsNullOrEmpty(request.Theme))
                    settings.Theme = request.Theme;

                if (!string.IsNullOrEmpty(request.Country))
                    settings.Country = request.Country;

                // Horario laboral — campos obligatorios. Si llegan vacíos los rechazamos
                // antes de guardar (en update parciales se permite no enviarlos).
                if (!string.IsNullOrWhiteSpace(request.HoraInicioJornada))
                {
                    settings.HoraInicioJornada = TimeOnly.Parse(request.HoraInicioJornada);
                }
                if (!string.IsNullOrWhiteSpace(request.HoraFinJornada))
                {
                    settings.HoraFinJornada = TimeOnly.Parse(request.HoraFinJornada);
                }
                if (!string.IsNullOrWhiteSpace(request.DiasLaborables))
                {
                    settings.DiasLaborables = request.DiasLaborables;
                }
                if (!string.IsNullOrWhiteSpace(request.ModoVentaDefault))
                {
                    // Whitelist — solo aceptar los 3 valores válidos.
                    var valid = new[] { "Preventa", "VentaDirecta", "Preguntar" };
                    if (Array.IndexOf(valid, request.ModoVentaDefault) >= 0)
                    {
                        settings.ModoVentaDefault = request.ModoVentaDefault;
                    }
                }

                settings.ActualizadoPor = userId.ToString();

                var updatedSettings = await _repository.UpdateAsync(settings);

                return new CompanySettingsDto
                {
                    Id = updatedSettings.Id,
                    Name = updatedSettings.CompanyName,
                    Logo = updatedSettings.LogoUrl,
                    PrimaryColor = updatedSettings.PrimaryColor,
                    SecondaryColor = updatedSettings.SecondaryColor,
                    CloudinaryFolder = updatedSettings.CloudinaryFolder,
                    Timezone = updatedSettings.Timezone,
                    Currency = updatedSettings.Currency,
                    Language = updatedSettings.Language,
                    Theme = updatedSettings.Theme,
                    Country = updatedSettings.Country,
                    HoraInicioJornada = updatedSettings.HoraInicioJornada.ToString("HH:mm"),
                    HoraFinJornada = updatedSettings.HoraFinJornada.ToString("HH:mm"),
                    DiasLaborables = updatedSettings.DiasLaborables,
                    ModoVentaDefault = updatedSettings.ModoVentaDefault,
                    UpdatedAt = updatedSettings.ActualizadoEn ?? updatedSettings.CreadoEn
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar configuración para tenant {TenantId}", tenantId);
                return null;
            }
        }

        public async Task<UploadLogoResponse?> UploadLogoAsync(int tenantId, int userId, IFormFile file)
        {
            try
            {
                var settings = await _repository.GetByTenantIdAsync(tenantId);
                
                if (settings == null)
                {
                    return null;
                }

                // Eliminar logo anterior si existe
                if (!string.IsNullOrEmpty(settings.LogoPublicId))
                {
                    await _cloudinaryService.DeleteImageAsync(settings.LogoPublicId);
                }

                // Obtener la carpeta específica de la empresa
                var logoFolder = _folderService.GetLogoFolder(settings.CloudinaryFolder ?? 
                    _folderService.GenerateCompanyFolderName(tenantId, settings.CompanyName));
                
                // Subir nuevo logo
                var uploadResult = await _cloudinaryService.UploadImageAsync(file, logoFolder);
                
                if (!uploadResult.IsSuccess)
                {
                    return null;
                }
                
                // Actualizar configuración
                settings.LogoUrl = uploadResult.SecureUrl;
                settings.LogoPublicId = uploadResult.PublicId;
                settings.ActualizadoPor = userId.ToString();

                await _repository.UpdateAsync(settings);

                return new UploadLogoResponse
                {
                    LogoUrl = settings.LogoUrl
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al subir logo para tenant {TenantId}", tenantId);
                return null;
            }
        }

        public async Task<bool> DeleteLogoAsync(int tenantId, int userId)
        {
            try
            {
                var settings = await _repository.GetByTenantIdAsync(tenantId);
                
                if (settings == null)
                {
                    return false;
                }

                // Eliminar de Cloudinary si existe
                if (!string.IsNullOrEmpty(settings.LogoPublicId))
                {
                    await _cloudinaryService.DeleteImageAsync(settings.LogoPublicId);
                }

                // Actualizar configuración
                settings.LogoUrl = null;
                settings.LogoPublicId = null;
                settings.ActualizadoPor = userId.ToString();

                await _repository.UpdateAsync(settings);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al eliminar logo para tenant {TenantId}", tenantId);
                return false;
            }
        }
    }
}