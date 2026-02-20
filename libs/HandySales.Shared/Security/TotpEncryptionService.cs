using System.Security.Cryptography;
using System.Text;

namespace HandySales.Shared.Security;

/// <summary>
/// Encrypts/decrypts TOTP secrets using AES-256-CBC.
/// Key is provided via configuration (TotpSettings:EncryptionKey).
/// </summary>
public class TotpEncryptionService
{
    private readonly byte[] _key;

    public TotpEncryptionService(string encryptionKey)
    {
        // Derive a 256-bit key from the provided string using SHA256
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(encryptionKey));
    }

    public string Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var encrypted = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        // Prepend IV to ciphertext
        var result = new byte[aes.IV.Length + encrypted.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(encrypted, 0, result, aes.IV.Length, encrypted.Length);

        return Convert.ToBase64String(result);
    }

    public string Decrypt(string cipherText)
    {
        var fullCipher = Convert.FromBase64String(cipherText);

        using var aes = Aes.Create();
        aes.Key = _key;

        // Extract IV (first 16 bytes)
        var iv = new byte[16];
        Buffer.BlockCopy(fullCipher, 0, iv, 0, 16);
        aes.IV = iv;

        // Extract ciphertext
        var cipher = new byte[fullCipher.Length - 16];
        Buffer.BlockCopy(fullCipher, 16, cipher, 0, cipher.Length);

        using var decryptor = aes.CreateDecryptor();
        var plainBytes = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);

        return Encoding.UTF8.GetString(plainBytes);
    }
}
