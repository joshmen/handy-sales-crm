namespace HandySales.Billing.Api.Services;

/// <summary>
/// Adapter for local dev / environments without KMS.
/// Delegates to the existing ICertificateEncryptionService (PBKDF2 + AES-GCM).
/// Ignores tenantId — all tenants share the same BILLING_ENCRYPTION_KEY.
/// </summary>
public class LegacyEncryptionAdapter : ITenantEncryptionService
{
    private readonly ICertificateEncryptionService _legacyService;

    public LegacyEncryptionAdapter(ICertificateEncryptionService legacyService)
    {
        _legacyService = legacyService;
    }

    public Task<EncryptionResult> EncryptAsync(string tenantId, byte[] plaintext)
    {
        var ciphertext = _legacyService.Encrypt(plaintext);
        // No DEK in legacy mode — return empty string
        return Task.FromResult(new EncryptionResult(ciphertext, ""));
    }

    public Task<byte[]> DecryptAsync(string tenantId, byte[] ciphertext, string? encryptedDek, short encryptionVersion)
    {
        return Task.FromResult(_legacyService.Decrypt(ciphertext));
    }
}
