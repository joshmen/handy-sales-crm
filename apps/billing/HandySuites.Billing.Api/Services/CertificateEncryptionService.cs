using System.Security.Cryptography;
using System.Text;

namespace HandySuites.Billing.Api.Services;

public interface ICertificateEncryptionService
{
    byte[] Encrypt(byte[] plaintext);
    byte[] Decrypt(byte[] ciphertext);
}

public class CertificateEncryptionService : ICertificateEncryptionService
{
    private readonly byte[] _masterKey;
    private readonly ILogger<CertificateEncryptionService> _logger;

    // PBKDF2 parameters
    private const int PBKDF2_ITERATIONS = 600_000;
    private const int SALT_SIZE = 16;
    private const int KEY_SIZE = 32; // AES-256
    private const int NONCE_SIZE = 12; // AES-GCM standard
    private const int TAG_SIZE = 16; // AES-GCM standard

    // Format: FORMAT_MARKER(4) || SALT(16) || NONCE(12) || TAG(16) || CIPHERTEXT
    // Legacy CBC format detection: missing marker prefix
    private static readonly byte[] FORMAT_MARKER = "GCM1"u8.ToArray(); // 4-byte marker

    public CertificateEncryptionService(IConfiguration config, ILogger<CertificateEncryptionService> logger)
    {
        _logger = logger;
        var keyBase64 = config["BILLING_ENCRYPTION_KEY"];
        if (string.IsNullOrEmpty(keyBase64))
            throw new InvalidOperationException(
                "BILLING_ENCRYPTION_KEY is required. Generate with: openssl rand -base64 32");
        _masterKey = Convert.FromBase64String(keyBase64);
        if (_masterKey.Length < 32)
            throw new InvalidOperationException("BILLING_ENCRYPTION_KEY must be at least 32 bytes (Base64)");
    }

    public byte[] Encrypt(byte[] plaintext)
    {
        // Derive a unique key per encryption using PBKDF2 + random salt
        var salt = RandomNumberGenerator.GetBytes(SALT_SIZE);
        using var kdf = new Rfc2898DeriveBytes(_masterKey, salt, PBKDF2_ITERATIONS, HashAlgorithmName.SHA256);
        var derivedKey = kdf.GetBytes(KEY_SIZE);

        var nonce = RandomNumberGenerator.GetBytes(NONCE_SIZE);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[TAG_SIZE];

        using var aesGcm = new AesGcm(derivedKey, TAG_SIZE);
        aesGcm.Encrypt(nonce, plaintext, ciphertext, tag);

        // Clear derived key from memory immediately
        Array.Clear(derivedKey);

        // Output: FORMAT_MARKER(4) || SALT(16) || NONCE(12) || TAG(16) || CIPHERTEXT
        var result = new byte[FORMAT_MARKER.Length + SALT_SIZE + NONCE_SIZE + TAG_SIZE + ciphertext.Length];
        var offset = 0;
        Buffer.BlockCopy(FORMAT_MARKER, 0, result, offset, FORMAT_MARKER.Length); offset += FORMAT_MARKER.Length;
        Buffer.BlockCopy(salt, 0, result, offset, SALT_SIZE); offset += SALT_SIZE;
        Buffer.BlockCopy(nonce, 0, result, offset, NONCE_SIZE); offset += NONCE_SIZE;
        Buffer.BlockCopy(tag, 0, result, offset, TAG_SIZE); offset += TAG_SIZE;
        Buffer.BlockCopy(ciphertext, 0, result, offset, ciphertext.Length);

        return result;
    }

    public byte[] Decrypt(byte[] data)
    {
        // Check if this is new GCM format or legacy CBC format
        if (data.Length > FORMAT_MARKER.Length && data.AsSpan(0, FORMAT_MARKER.Length).SequenceEqual(FORMAT_MARKER))
        {
            return DecryptGcm(data);
        }
        // Legacy CBC fallback — for data encrypted before migration
        return DecryptLegacyCbc(data);
    }

    private byte[] DecryptGcm(byte[] data)
    {
        var offset = FORMAT_MARKER.Length;
        var salt = data.AsSpan(offset, SALT_SIZE).ToArray(); offset += SALT_SIZE;
        var nonce = data.AsSpan(offset, NONCE_SIZE).ToArray(); offset += NONCE_SIZE;
        var tag = data.AsSpan(offset, TAG_SIZE).ToArray(); offset += TAG_SIZE;
        var ciphertext = data.AsSpan(offset).ToArray();

        using var kdf = new Rfc2898DeriveBytes(_masterKey, salt, PBKDF2_ITERATIONS, HashAlgorithmName.SHA256);
        var derivedKey = kdf.GetBytes(KEY_SIZE);

        var plaintext = new byte[ciphertext.Length];
        using var aesGcm = new AesGcm(derivedKey, TAG_SIZE);
        aesGcm.Decrypt(nonce, ciphertext, tag, plaintext);

        Array.Clear(derivedKey);
        return plaintext;
    }

    private byte[] DecryptLegacyCbc(byte[] data)
    {
        // Legacy: IV(16) || CIPHERTEXT, key = SHA256(masterKey)
        using var sha = SHA256.Create();
        var key = sha.ComputeHash(_masterKey);

        var iv = data.AsSpan(0, 16).ToArray();
        var ciphertext = data.AsSpan(16).ToArray();

        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        using var decryptor = aes.CreateDecryptor();
        var plaintext = decryptor.TransformFinalBlock(ciphertext, 0, ciphertext.Length);

        Array.Clear(key);
        return plaintext;
    }
}
