using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using HandySales.Application.CompanySettings.Interfaces;

namespace HandySales.Infrastructure.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration configuration)
        {
            var cloudinaryUrl = configuration["Cloudinary:Url"];
            
            if (string.IsNullOrEmpty(cloudinaryUrl))
            {
                throw new ArgumentException("Cloudinary URL is not configured");
            }

            _cloudinary = new Cloudinary(cloudinaryUrl);
        }

        public string GenerateTenantFolder(int tenantId, string tenantName)
        {
            // Generar nombre de carpeta único para cada tenant
            var sanitizedName = System.Text.RegularExpressions.Regex.Replace(tenantName, @"[^a-zA-Z0-9-_]", "");
            return $"tenants/{tenantId}-{sanitizedName}";
        }

        public async Task<bool> CreateFolderAsync(string folderPath)
        {
            try
            {
                // Cloudinary crea las carpetas automáticamente cuando se sube un archivo
                // Subimos un archivo placeholder para crear la carpeta
                var placeholderParams = new ImageUploadParams()
                {
                    File = new FileDescription("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
                    Folder = folderPath,
                    PublicId = ".placeholder",
                    UniqueFilename = false,
                    Overwrite = true
                };

                var result = await _cloudinary.UploadAsync(placeholderParams);
                return result.Error == null;
            }
            catch
            {
                return false;
            }
        }

        public async Task<CloudinaryUploadResult> UploadImageFromBase64Async(string base64Image, string folder, string fileName)
        {
            if (string.IsNullOrEmpty(base64Image))
            {
                return new CloudinaryUploadResult
                {
                    IsSuccess = false,
                    ErrorMessage = "Base64 image is required"
                };
            }

            // Remover el prefijo del data URL si existe
            var base64Data = base64Image;
            if (base64Image.Contains(","))
            {
                base64Data = base64Image.Split(',')[1];
            }

            var uploadParams = new ImageUploadParams()
            {
                File = new FileDescription($"data:image/png;base64,{base64Data}"),
                Folder = folder,
                PublicId = fileName,
                Transformation = new Transformation()
                    .Width(400)
                    .Height(400)
                    .Crop("limit")
                    .Quality("auto")
                    .FetchFormat("auto"),
                UniqueFilename = false,
                Overwrite = true
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.Error != null)
            {
                return new CloudinaryUploadResult
                {
                    IsSuccess = false,
                    ErrorMessage = result.Error.Message
                };
            }

            return new CloudinaryUploadResult
            {
                IsSuccess = true,
                SecureUrl = result.SecureUrl.ToString(),
                PublicId = result.PublicId
            };
        }

        public async Task<CloudinaryUploadResult> UploadImageAsync(IFormFile file, string folder = "company-logos")
        {
            if (file == null || file.Length == 0)
            {
                return new CloudinaryUploadResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "File is required" 
                };
            }

            // Validar tipo de archivo
            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
            if (!allowedTypes.Contains(file.ContentType.ToLower()))
            {
                return new CloudinaryUploadResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Only JPEG, PNG, and WebP images are allowed" 
                };
            }

            // Validar tamaño (máximo 5MB)
            if (file.Length > 5 * 1024 * 1024)
            {
                return new CloudinaryUploadResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "File size cannot exceed 5MB" 
                };
            }

            using var stream = file.OpenReadStream();
            
            var uploadParams = new ImageUploadParams()
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder,
                Transformation = new Transformation()
                    .Width(400)
                    .Height(400)
                    .Crop("limit")
                    .Quality("auto")
                    .FetchFormat("auto"),
                UniqueFilename = true,
                Overwrite = false
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.Error != null)
            {
                return new CloudinaryUploadResult
                {
                    IsSuccess = false,
                    ErrorMessage = result.Error.Message
                };
            }

            return new CloudinaryUploadResult
            {
                IsSuccess = true,
                SecureUrl = result.SecureUrl.ToString(),
                PublicId = result.PublicId
            };
        }

        public async Task<CloudinaryDeletionResult> DeleteImageAsync(string publicId)
        {
            if (string.IsNullOrEmpty(publicId))
            {
                return new CloudinaryDeletionResult
                {
                    IsSuccess = false,
                    ErrorMessage = "Public ID is required"
                };
            }

            var deleteParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deleteParams);

            return new CloudinaryDeletionResult
            {
                IsSuccess = result.Result == "ok",
                ErrorMessage = result.Result != "ok" ? "Failed to delete image" : string.Empty
            };
        }
    }
}