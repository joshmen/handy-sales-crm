namespace HandySuites.Billing.Api.Services;

/// <summary>
/// Tenant-aware encryption service using AWS KMS envelope encryption.
/// Each tenant gets a unique Data Encryption Key (DEK) protected by a KMS CMK.
/// </summary>
public interface ITenantEncryptionService
{
    /// <summary>
    /// Encrypt data using per-tenant KMS envelope encryption.
    /// Generates a new DEK via KMS GenerateDataKey on first call per tenant.
    /// </summary>
    Task<EncryptionResult> EncryptAsync(string tenantId, byte[] plaintext);

    /// <summary>
    /// Decrypt data. Routes to KMS (v2) or legacy PBKDF2 (v1) based on encryptionVersion.
    /// </summary>
    Task<byte[]> DecryptAsync(string tenantId, byte[] ciphertext, string? encryptedDek, short encryptionVersion);
}

/// <summary>Ciphertext + the KMS-encrypted DEK (Base64) to store alongside the ciphertext.</summary>
public record EncryptionResult(byte[] Ciphertext, string EncryptedDek);
