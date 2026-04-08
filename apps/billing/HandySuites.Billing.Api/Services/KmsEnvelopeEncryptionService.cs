using System.Security.Cryptography;
using Amazon.KeyManagementService;
using Amazon.KeyManagementService.Model;
using Microsoft.Extensions.Caching.Memory;

namespace HandySuites.Billing.Api.Services;

/// <summary>
/// AWS KMS envelope encryption: per-tenant DEK protected by a CMK.
/// Format: KMS1(4) || NONCE(12) || TAG(16) || CIPHERTEXT
/// The DEK is stored encrypted (by KMS) alongside the ciphertext in the DB.
/// </summary>
public class KmsEnvelopeEncryptionService : ITenantEncryptionService
{
    private readonly IAmazonKeyManagementService _kmsClient;
    private readonly IMemoryCache _cache;
    private readonly ICertificateEncryptionService _legacyService;
    private readonly string _cmkArn;
    private readonly ILogger<KmsEnvelopeEncryptionService> _logger;

    private const int NONCE_SIZE = 12;
    private const int TAG_SIZE = 16;
    private static readonly byte[] FORMAT_MARKER = "KMS1"u8.ToArray();
    private static readonly TimeSpan DEK_CACHE_TTL = TimeSpan.FromMinutes(5);

    public KmsEnvelopeEncryptionService(
        IAmazonKeyManagementService kmsClient,
        IMemoryCache cache,
        ICertificateEncryptionService legacyService,
        IConfiguration configuration,
        ILogger<KmsEnvelopeEncryptionService> logger)
    {
        _kmsClient = kmsClient;
        _cache = cache;
        _legacyService = legacyService;
        _cmkArn = configuration["KMS_CMK_ARN"]
            ?? throw new InvalidOperationException("KMS_CMK_ARN is required when using KMS encryption");
        _logger = logger;
    }

    public async Task<EncryptionResult> EncryptAsync(string tenantId, byte[] plaintext)
    {
        // Generate a fresh DEK via KMS (or reuse cached one for batch operations)
        var (plaintextDek, encryptedDekBase64) = await GetOrGenerateDekAsync(tenantId);

        try
        {
            var ciphertext = EncryptWithDek(plaintextDek, plaintext);
            _logger.LogInformation("CSD_AUDIT: KMS encrypt for tenant {TenantId}, ciphertext {Length} bytes",
                tenantId, ciphertext.Length);
            return new EncryptionResult(ciphertext, encryptedDekBase64);
        }
        finally
        {
            // Don't clear here — DEK is cached for batch encrypt (e.g., key + password in same upload)
            // Cache eviction callback handles cleanup
        }
    }

    public async Task<byte[]> DecryptAsync(string tenantId, byte[] ciphertext, string? encryptedDek, short encryptionVersion)
    {
        // Legacy v1: delegate to PBKDF2-based service
        if (encryptionVersion <= 1 || string.IsNullOrEmpty(encryptedDek))
        {
            _logger.LogDebug("CSD_AUDIT: Legacy v1 decrypt for tenant {TenantId}", tenantId);
            return _legacyService.Decrypt(ciphertext);
        }

        // v2: KMS envelope decrypt
        var plaintextDek = await GetOrDecryptDekAsync(tenantId, encryptedDek);
        try
        {
            var plaintext = DecryptWithDek(plaintextDek, ciphertext);
            _logger.LogDebug("CSD_AUDIT: KMS v2 decrypt for tenant {TenantId}, plaintext {Length} bytes",
                tenantId, plaintext.Length);
            return plaintext;
        }
        finally
        {
            // DEK is in cache — don't clear the reference
        }
    }

    private async Task<(byte[] PlaintextDek, string EncryptedDekBase64)> GetOrGenerateDekAsync(string tenantId)
    {
        var cacheKey = $"dek:gen:{tenantId}";

        if (_cache.TryGetValue(cacheKey, out (byte[] Plaintext, string EncryptedBase64) cached))
            return cached;

        var response = await RetryKmsCallAsync(() => _kmsClient.GenerateDataKeyAsync(new GenerateDataKeyRequest
        {
            KeyId = _cmkArn,
            KeySpec = DataKeySpec.AES_256,
            EncryptionContext = new Dictionary<string, string> { ["TenantId"] = tenantId }
        }));

        var plaintextDek = response.Plaintext.ToArray();
        var encryptedDekBase64 = Convert.ToBase64String(response.CiphertextBlob.ToArray());

        var entry = _cache.CreateEntry(cacheKey);
        entry.Value = (plaintextDek, encryptedDekBase64);
        entry.AbsoluteExpirationRelativeToNow = DEK_CACHE_TTL;
        entry.RegisterPostEvictionCallback((_, value, _, _) =>
        {
            if (value is (byte[] dek, string _))
                Array.Clear(dek);
        });
        entry.Dispose(); // Commits entry to cache

        _logger.LogInformation("CSD_AUDIT: Generated new KMS DEK for tenant {TenantId}", tenantId);
        return (plaintextDek, encryptedDekBase64);
    }

    private async Task<byte[]> GetOrDecryptDekAsync(string tenantId, string encryptedDekBase64)
    {
        var cacheKey = $"dek:dec:{tenantId}";

        if (_cache.TryGetValue(cacheKey, out byte[]? cached) && cached != null)
            return cached;

        var encryptedDekBytes = Convert.FromBase64String(encryptedDekBase64);

        var response = await RetryKmsCallAsync(() => _kmsClient.DecryptAsync(new DecryptRequest
        {
            CiphertextBlob = new MemoryStream(encryptedDekBytes),
            EncryptionContext = new Dictionary<string, string> { ["TenantId"] = tenantId }
        }));

        var plaintextDek = response.Plaintext.ToArray();

        var entry = _cache.CreateEntry(cacheKey);
        entry.Value = plaintextDek;
        entry.AbsoluteExpirationRelativeToNow = DEK_CACHE_TTL;
        entry.RegisterPostEvictionCallback((_, value, _, _) =>
        {
            if (value is byte[] dek)
                Array.Clear(dek);
        });
        entry.Dispose();

        _logger.LogDebug("CSD_AUDIT: Decrypted KMS DEK for tenant {TenantId} (cache miss)", tenantId);
        return plaintextDek;
    }

    private static byte[] EncryptWithDek(byte[] dek, byte[] plaintext)
    {
        var nonce = RandomNumberGenerator.GetBytes(NONCE_SIZE);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[TAG_SIZE];

        using var aesGcm = new AesGcm(dek, TAG_SIZE);
        aesGcm.Encrypt(nonce, plaintext, ciphertext, tag);

        // Format: KMS1(4) || NONCE(12) || TAG(16) || CIPHERTEXT
        var result = new byte[FORMAT_MARKER.Length + NONCE_SIZE + TAG_SIZE + ciphertext.Length];
        var offset = 0;
        Buffer.BlockCopy(FORMAT_MARKER, 0, result, offset, FORMAT_MARKER.Length); offset += FORMAT_MARKER.Length;
        Buffer.BlockCopy(nonce, 0, result, offset, NONCE_SIZE); offset += NONCE_SIZE;
        Buffer.BlockCopy(tag, 0, result, offset, TAG_SIZE); offset += TAG_SIZE;
        Buffer.BlockCopy(ciphertext, 0, result, offset, ciphertext.Length);

        return result;
    }

    private static byte[] DecryptWithDek(byte[] dek, byte[] data)
    {
        var offset = FORMAT_MARKER.Length; // skip "KMS1"
        var nonce = data.AsSpan(offset, NONCE_SIZE).ToArray(); offset += NONCE_SIZE;
        var tag = data.AsSpan(offset, TAG_SIZE).ToArray(); offset += TAG_SIZE;
        var ciphertext = data.AsSpan(offset).ToArray();

        var plaintext = new byte[ciphertext.Length];
        using var aesGcm = new AesGcm(dek, TAG_SIZE);
        aesGcm.Decrypt(nonce, ciphertext, tag, plaintext);

        return plaintext;
    }

    private static async Task<T> RetryKmsCallAsync<T>(Func<Task<T>> action)
    {
        const int maxRetries = 3;
        for (int attempt = 1; ; attempt++)
        {
            try
            {
                return await action();
            }
            catch (Exception) when (attempt < maxRetries)
            {
                var delay = TimeSpan.FromMilliseconds(100 * Math.Pow(2, attempt));
                await Task.Delay(delay);
            }
        }
    }
}
