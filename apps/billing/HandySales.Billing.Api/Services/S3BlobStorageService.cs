using System.Text;
using Amazon.S3;
using Amazon.S3.Model;

namespace HandySales.Billing.Api.Services;

public class S3BlobStorageService : IBlobStorageService
{
    private const string XmlPrefix = "cfdi-xml";
    private const string PdfPrefix = "cfdi-pdf";

    private readonly IAmazonS3 _s3;
    private readonly string _bucketName;
    private readonly ILogger<S3BlobStorageService> _logger;

    public S3BlobStorageService(IAmazonS3 s3, IConfiguration config, ILogger<S3BlobStorageService> logger)
    {
        _s3 = s3;
        _bucketName = config["AWS_S3_BUCKET"] ?? "handysuites-facturas";
        _logger = logger;
    }

    public async Task<string> UploadXmlAsync(string tenantId, string uuid, string xmlContent)
    {
        var now = DateTime.UtcNow;
        var key = $"{XmlPrefix}/{tenantId}/{now.Year}/{now.Month:D2}/{uuid}.xml";

        var bytes = Encoding.UTF8.GetBytes(xmlContent);
        using var stream = new MemoryStream(bytes);

        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = stream,
            ContentType = "application/xml",
        });

        _logger.LogInformation("Uploaded XML to S3: {Key} ({Size} bytes)", key, bytes.Length);
        return key;
    }

    public async Task<string> UploadPdfAsync(string tenantId, string uuid, byte[] pdfBytes)
    {
        var now = DateTime.UtcNow;
        var key = $"{PdfPrefix}/{tenantId}/{now.Year}/{now.Month:D2}/{uuid}.pdf";

        using var stream = new MemoryStream(pdfBytes);

        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = stream,
            ContentType = "application/pdf",
        });

        _logger.LogInformation("Uploaded PDF to S3: {Key} ({Size} bytes)", key, pdfBytes.Length);
        return key;
    }

    public async Task<string> GetXmlAsync(string blobPath)
    {
        var response = await _s3.GetObjectAsync(_bucketName, blobPath);
        using var reader = new StreamReader(response.ResponseStream, Encoding.UTF8);
        return await reader.ReadToEndAsync();
    }

    public async Task<byte[]> GetPdfAsync(string blobPath)
    {
        var response = await _s3.GetObjectAsync(_bucketName, blobPath);
        using var ms = new MemoryStream();
        await response.ResponseStream.CopyToAsync(ms);
        return ms.ToArray();
    }

    public Task<string> GenerateSasUrlAsync(string blobPath, string containerName, TimeSpan? expiry = null)
    {
        // S3 equivalent of Azure SAS: presigned URL
        var key = containerName == "cfdi-xml" || containerName == "cfdi-pdf"
            ? blobPath  // Already includes prefix
            : $"{containerName}/{blobPath}";

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Expires = DateTime.UtcNow.Add(expiry ?? TimeSpan.FromMinutes(5)),
            Verb = HttpVerb.GET,
        };

        var url = _s3.GetPreSignedURL(request);
        return Task.FromResult(url);
    }

    public async Task DeleteBlobAsync(string blobPath, string containerName)
    {
        var key = containerName == "cfdi-xml" || containerName == "cfdi-pdf"
            ? blobPath
            : $"{containerName}/{blobPath}";

        await _s3.DeleteObjectAsync(_bucketName, key);
        _logger.LogInformation("Deleted S3 object: {Key}", key);
    }
}
