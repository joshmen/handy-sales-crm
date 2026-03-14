namespace HandySales.Billing.Api.Services;

public interface IBlobStorageService
{
    /// <summary>
    /// Uploads a timbrado XML to Azure Blob Storage.
    /// Path: cfdi-xml/{tenantId}/{year}/{month}/{uuid}.xml
    /// </summary>
    Task<string> UploadXmlAsync(string tenantId, string uuid, string xmlContent);

    /// <summary>
    /// Uploads a generated PDF to Azure Blob Storage.
    /// Path: cfdi-pdf/{tenantId}/{year}/{month}/{uuid}.pdf
    /// </summary>
    Task<string> UploadPdfAsync(string tenantId, string uuid, byte[] pdfBytes);

    /// <summary>
    /// Retrieves XML content from Blob Storage.
    /// </summary>
    Task<string> GetXmlAsync(string blobPath);

    /// <summary>
    /// Retrieves PDF bytes from Blob Storage.
    /// </summary>
    Task<byte[]> GetPdfAsync(string blobPath);

    /// <summary>
    /// Generates a temporary SAS URL for downloading a blob (default 5 min expiry).
    /// </summary>
    Task<string> GenerateSasUrlAsync(string blobPath, string containerName, TimeSpan? expiry = null);

    /// <summary>
    /// Deletes a blob from storage (for cleanup on cancellation errors, etc.).
    /// </summary>
    Task DeleteBlobAsync(string blobPath, string containerName);
}
