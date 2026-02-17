using Microsoft.AspNetCore.Http;

namespace HandySales.Application.CompanySettings.Interfaces
{
    public interface ICloudinaryService
    {
        Task<CloudinaryUploadResult> UploadImageAsync(IFormFile file, string folder = "company-logos");
        Task<CloudinaryUploadResult> UploadImageFromBase64Async(string base64Image, string folder, string fileName);
        Task<CloudinaryDeletionResult> DeleteImageAsync(string publicId);
        Task<bool> CreateFolderAsync(string folderPath);
        string GenerateTenantFolder(int tenantId, string tenantName);
    }

    public class CloudinaryUploadResult
    {
        public string SecureUrl { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }

    public class CloudinaryDeletionResult
    {
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }
}