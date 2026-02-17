namespace HandySales.Application.CompanySettings.Interfaces
{
    public interface ICloudinaryFolderService
    {
        string GenerateCompanyFolderName(int tenantId, string companyName);
        Task<bool> EnsureFolderStructureAsync(string folderPath);
        string GetLogoFolder(string companyFolder);
        string GetProductsFolder(string companyFolder);
        string GetUsersFolder(string companyFolder);
        string GetDocumentsFolder(string companyFolder);
    }
}