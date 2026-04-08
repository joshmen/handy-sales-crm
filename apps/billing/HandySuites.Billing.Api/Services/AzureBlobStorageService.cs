using System.Text;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace HandySuites.Billing.Api.Services;

public class AzureBlobStorageService : IBlobStorageService
{
    private const string XmlContainer = "cfdi-xml";
    private const string PdfContainer = "cfdi-pdf";

    private readonly BlobServiceClient _blobServiceClient;
    private readonly ILogger<AzureBlobStorageService> _logger;

    public AzureBlobStorageService(BlobServiceClient blobServiceClient, ILogger<AzureBlobStorageService> logger)
    {
        _blobServiceClient = blobServiceClient;
        _logger = logger;
    }

    public async Task<string> UploadXmlAsync(string tenantId, string uuid, string xmlContent)
    {
        var now = DateTime.UtcNow;
        var blobPath = $"{tenantId}/{now.Year}/{now.Month:D2}/{uuid}.xml";

        var containerClient = _blobServiceClient.GetBlobContainerClient(XmlContainer);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.None);

        var blobClient = containerClient.GetBlobClient(blobPath);
        var bytes = Encoding.UTF8.GetBytes(xmlContent);
        using var stream = new MemoryStream(bytes);

        await blobClient.UploadAsync(stream, overwrite: true);

        _logger.LogInformation("Uploaded XML blob: {Container}/{Path} ({Size} bytes)", XmlContainer, blobPath, bytes.Length);
        return blobPath;
    }

    public async Task<string> UploadPdfAsync(string tenantId, string uuid, byte[] pdfBytes)
    {
        var now = DateTime.UtcNow;
        var blobPath = $"{tenantId}/{now.Year}/{now.Month:D2}/{uuid}.pdf";

        var containerClient = _blobServiceClient.GetBlobContainerClient(PdfContainer);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.None);

        var blobClient = containerClient.GetBlobClient(blobPath);
        using var stream = new MemoryStream(pdfBytes);

        await blobClient.UploadAsync(stream, overwrite: true);

        _logger.LogInformation("Uploaded PDF blob: {Container}/{Path} ({Size} bytes)", PdfContainer, blobPath, pdfBytes.Length);
        return blobPath;
    }

    public async Task<string> GetXmlAsync(string blobPath)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(XmlContainer);
        var blobClient = containerClient.GetBlobClient(blobPath);

        var response = await blobClient.DownloadContentAsync();
        return response.Value.Content.ToString();
    }

    public async Task<byte[]> GetPdfAsync(string blobPath)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(PdfContainer);
        var blobClient = containerClient.GetBlobClient(blobPath);

        var response = await blobClient.DownloadContentAsync();
        return response.Value.Content.ToArray();
    }

    public Task<string> GenerateSasUrlAsync(string blobPath, string containerName, TimeSpan? expiry = null)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(blobPath);

        if (!blobClient.CanGenerateSasUri)
        {
            throw new InvalidOperationException(
                "BlobClient cannot generate SAS URI. Ensure the connection string includes an account key.");
        }

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = containerName,
            BlobName = blobPath,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(expiry ?? TimeSpan.FromMinutes(5))
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        var sasUri = blobClient.GenerateSasUri(sasBuilder);
        return Task.FromResult(sasUri.ToString());
    }

    public async Task DeleteBlobAsync(string blobPath, string containerName)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(blobPath);
        await blobClient.DeleteIfExistsAsync();
        _logger.LogInformation("Deleted blob: {Container}/{Path}", containerName, blobPath);
    }
}
