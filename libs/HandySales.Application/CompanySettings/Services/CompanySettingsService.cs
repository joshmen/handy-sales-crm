using HandySales.Application.CompanySettings.DTOs;
using HandySales.Application.CompanySettings.Interfaces;
using HandySales.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace HandySales.Application.CompanySettings.Services
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

        public CompanySettingsService(
            ICompanySettingsRepository repository,
            ICloudinaryService cloudinaryService,
            ICloudinaryFolderService folderService)
        {
            _repository = repository;
            _cloudinaryService = cloudinaryService;
            _folderService = folderService;
        }

        public async Task<CompanySettingsDto?> GetSettingsAsync(int tenantId)
        {
            try
            {
                var settings = await _repository.GetByTenantIdAsync(tenantId);
                
                if (settings == null)
                {
                    // Crear configuración por defecto si no existe
                    var defaultCompanyName = "HandyCRM";
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

                return new CompanySettingsDto
                {
                    Id = settings.Id,
                    Name = settings.CompanyName,
                    Logo = settings.LogoUrl,
                    PrimaryColor = settings.PrimaryColor,
                    SecondaryColor = settings.SecondaryColor,
                    Address = settings.Address,
                    Phone = settings.Phone,
                    Email = settings.Email,
                    Website = settings.Website,
                    Description = settings.Description,
                    CloudinaryFolder = settings.CloudinaryFolder,
                    UpdatedAt = settings.ActualizadoEn ?? settings.CreadoEn,
                    UpdatedBy = settings.ActualizadoPor
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al obtener configuración: {ex.Message}");
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

                if (request.Address != null)
                    settings.Address = request.Address;

                if (request.Phone != null)
                    settings.Phone = request.Phone;

                if (request.Email != null)
                    settings.Email = request.Email;

                if (request.Website != null)
                    settings.Website = request.Website;

                if (request.Description != null)
                    settings.Description = request.Description;

                settings.ActualizadoPor = userId.ToString();

                var updatedSettings = await _repository.UpdateAsync(settings);

                return new CompanySettingsDto
                {
                    Id = updatedSettings.Id,
                    Name = updatedSettings.CompanyName,
                    Logo = updatedSettings.LogoUrl,
                    PrimaryColor = updatedSettings.PrimaryColor,
                    SecondaryColor = updatedSettings.SecondaryColor,
                    Address = updatedSettings.Address,
                    Phone = updatedSettings.Phone,
                    Email = updatedSettings.Email,
                    Website = updatedSettings.Website,
                    Description = updatedSettings.Description,
                    CloudinaryFolder = updatedSettings.CloudinaryFolder,
                    UpdatedAt = updatedSettings.ActualizadoEn ?? updatedSettings.CreadoEn
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error al actualizar configuración: {ex.Message}");
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
                Console.WriteLine($"Error al subir logo: {ex.Message}");
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
                Console.WriteLine($"Error al eliminar logo: {ex.Message}");
                return false;
            }
        }
    }
}