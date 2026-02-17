using Microsoft.AspNetCore.Http;

namespace HandySales.Application.Common.Interfaces;

public interface ICloudinaryService
{
    Task<string> UploadImageAsync(IFormFile file, string folder);
    Task<string> UploadImageFromBase64Async(string base64Image, string folder, string publicId);
    Task<bool> DeleteImageAsync(string publicId);
    Task<bool> CreateFolderAsync(string folderPath);
    string GetImageUrl(string publicId, int width = 0, int height = 0);
}