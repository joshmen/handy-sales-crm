using System.Security.Cryptography;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Security;
using Microsoft.EntityFrameworkCore;
using OtpNet;
using QRCoder;

namespace HandySales.Api.TwoFactor;

public class TotpService
{
    private readonly HandySalesDbContext _db;
    private readonly TotpEncryptionService _encryption;

    public TotpService(HandySalesDbContext db, TotpEncryptionService encryption)
    {
        _db = db;
        _encryption = encryption;
    }

    /// <summary>
    /// Generates a new TOTP secret and returns QR code + manual key for setup.
    /// Does NOT enable 2FA yet — user must verify a code first.
    /// </summary>
    public async Task<TotpSetupResult> GenerateSetupAsync(int userId)
    {
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        if (usuario == null)
            throw new InvalidOperationException("Usuario no encontrado");

        if (usuario.TotpEnabled)
            throw new InvalidOperationException("2FA ya está habilitado");

        // Generate a 160-bit (20-byte) secret
        var secretBytes = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretBytes);

        // Store encrypted secret (not yet enabled)
        usuario.TotpSecretEncrypted = _encryption.Encrypt(base32Secret);
        await _db.SaveChangesAsync();

        // Generate otpauth URI
        var issuer = "HandySales";
        var otpauthUri = $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(usuario.Email)}?secret={base32Secret}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits=6&period=30";

        // Generate QR code as base64 PNG
        var qrBase64 = GenerateQrCodeBase64(otpauthUri);

        return new TotpSetupResult
        {
            QrCodeBase64 = qrBase64,
            ManualKey = FormatManualKey(base32Secret),
            OtpauthUri = otpauthUri
        };
    }

    /// <summary>
    /// Verifies a TOTP code and enables 2FA if valid. Generates recovery codes.
    /// </summary>
    public async Task<TotpEnableResult> EnableAsync(int userId, string code)
    {
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        if (usuario == null)
            throw new InvalidOperationException("Usuario no encontrado");

        if (usuario.TotpEnabled)
            throw new InvalidOperationException("2FA ya está habilitado");

        if (string.IsNullOrEmpty(usuario.TotpSecretEncrypted))
            throw new InvalidOperationException("Primero ejecuta /api/2fa/setup para generar el secreto");

        // Decrypt and verify the code
        var base32Secret = _encryption.Decrypt(usuario.TotpSecretEncrypted);
        if (!VerifyCode(base32Secret, code))
            throw new InvalidOperationException("Código inválido. Verifica que tu reloj esté sincronizado.");

        // Enable 2FA
        usuario.TotpEnabled = true;
        usuario.TotpEnabledAt = DateTime.UtcNow;

        // Generate recovery codes
        var recoveryCodes = GenerateRecoveryCodes(10);

        // Delete any existing recovery codes
        var existing = await _db.TwoFactorRecoveryCodes
            .Where(rc => rc.UsuarioId == userId)
            .ToListAsync();
        _db.RemoveRange(existing);

        // Store hashed recovery codes
        foreach (var plainCode in recoveryCodes)
        {
            _db.TwoFactorRecoveryCodes.Add(new TwoFactorRecoveryCode
            {
                UsuarioId = userId,
                CodeHash = BCrypt.Net.BCrypt.HashPassword(plainCode)
            });
        }

        // Increment session version (forces re-login to get updated claims)
        usuario.SessionVersion++;

        await _db.SaveChangesAsync();

        return new TotpEnableResult
        {
            Enabled = true,
            RecoveryCodes = recoveryCodes
        };
    }

    /// <summary>
    /// Disables 2FA. Requires a valid TOTP code for confirmation.
    /// </summary>
    public async Task<bool> DisableAsync(int userId, string code)
    {
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        if (usuario == null || !usuario.TotpEnabled || string.IsNullOrEmpty(usuario.TotpSecretEncrypted))
            return false;

        var base32Secret = _encryption.Decrypt(usuario.TotpSecretEncrypted);
        if (!VerifyCode(base32Secret, code))
            return false;

        // Disable 2FA
        usuario.TotpEnabled = false;
        usuario.TotpEnabledAt = null;
        usuario.TotpSecretEncrypted = null;

        // Delete recovery codes
        var recoveryCodes = await _db.TwoFactorRecoveryCodes
            .Where(rc => rc.UsuarioId == userId)
            .ToListAsync();
        _db.RemoveRange(recoveryCodes);

        // Increment session version
        usuario.SessionVersion++;

        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Returns 2FA status for a user.
    /// </summary>
    public async Task<TotpStatusResult> GetStatusAsync(int userId)
    {
        var usuario = await _db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.Id == userId)
            .Select(u => new { u.TotpEnabled, u.TotpEnabledAt })
            .FirstOrDefaultAsync();

        if (usuario == null)
            throw new InvalidOperationException("Usuario no encontrado");

        var remainingCodes = await _db.TwoFactorRecoveryCodes
            .CountAsync(rc => rc.UsuarioId == userId && rc.UsedAt == null);

        return new TotpStatusResult
        {
            Enabled = usuario.TotpEnabled,
            EnabledAt = usuario.TotpEnabledAt,
            RemainingRecoveryCodes = remainingCodes
        };
    }

    /// <summary>
    /// Regenerates recovery codes. Requires valid TOTP code.
    /// </summary>
    public async Task<List<string>> RegenerateRecoveryCodesAsync(int userId, string code)
    {
        var usuario = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId);
        if (usuario == null || !usuario.TotpEnabled || string.IsNullOrEmpty(usuario.TotpSecretEncrypted))
            throw new InvalidOperationException("2FA no está habilitado");

        var base32Secret = _encryption.Decrypt(usuario.TotpSecretEncrypted);
        if (!VerifyCode(base32Secret, code))
            throw new InvalidOperationException("Código inválido");

        // Delete existing and generate new
        var existing = await _db.TwoFactorRecoveryCodes
            .Where(rc => rc.UsuarioId == userId)
            .ToListAsync();
        _db.RemoveRange(existing);

        var recoveryCodes = GenerateRecoveryCodes(10);
        foreach (var plainCode in recoveryCodes)
        {
            _db.TwoFactorRecoveryCodes.Add(new TwoFactorRecoveryCode
            {
                UsuarioId = userId,
                CodeHash = BCrypt.Net.BCrypt.HashPassword(plainCode)
            });
        }

        await _db.SaveChangesAsync();
        return recoveryCodes;
    }

    /// <summary>
    /// Verifies a TOTP code for a user during login flow.
    /// </summary>
    public async Task<bool> VerifyLoginCodeAsync(int userId, string code)
    {
        var usuario = await _db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.Id == userId)
            .Select(u => new { u.TotpSecretEncrypted, u.TotpEnabled })
            .FirstOrDefaultAsync();

        if (usuario == null || !usuario.TotpEnabled || string.IsNullOrEmpty(usuario.TotpSecretEncrypted))
            return false;

        var base32Secret = _encryption.Decrypt(usuario.TotpSecretEncrypted);
        return VerifyCode(base32Secret, code);
    }

    /// <summary>
    /// Attempts to use a recovery code. Returns true if valid and marks it as used.
    /// </summary>
    public async Task<bool> UseRecoveryCodeAsync(int userId, string code)
    {
        var recoveryCodes = await _db.TwoFactorRecoveryCodes
            .Where(rc => rc.UsuarioId == userId && rc.UsedAt == null)
            .ToListAsync();

        foreach (var rc in recoveryCodes)
        {
            if (BCrypt.Net.BCrypt.Verify(code, rc.CodeHash))
            {
                rc.UsedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return true;
            }
        }

        return false;
    }

    private bool VerifyCode(string base32Secret, string code)
    {
        var secretBytes = Base32Encoding.ToBytes(base32Secret);
        var totp = new Totp(secretBytes, step: 30, totpSize: 6);
        return totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));
    }

    private static string GenerateQrCodeBase64(string otpauthUri)
    {
        var qrGenerator = new QRCodeGenerator();
        var qrCodeData = qrGenerator.CreateQrCode(otpauthUri, QRCodeGenerator.ECCLevel.Q);
        var pngQr = new PngByteQRCode(qrCodeData);
        var pngBytes = pngQr.GetGraphic(5);
        return Convert.ToBase64String(pngBytes);
    }

    private static string FormatManualKey(string base32Secret)
    {
        var formatted = new System.Text.StringBuilder();
        for (int i = 0; i < base32Secret.Length; i++)
        {
            if (i > 0 && i % 4 == 0)
                formatted.Append(' ');
            formatted.Append(base32Secret[i]);
        }
        return formatted.ToString();
    }

    private static List<string> GenerateRecoveryCodes(int count)
    {
        var codes = new List<string>();
        for (int i = 0; i < count; i++)
        {
            var part1 = RandomNumberGenerator.GetHexString(4).ToUpperInvariant();
            var part2 = RandomNumberGenerator.GetHexString(4).ToUpperInvariant();
            codes.Add($"{part1}-{part2}");
        }
        return codes;
    }
}

public class TotpSetupResult
{
    public string QrCodeBase64 { get; set; } = string.Empty;
    public string ManualKey { get; set; } = string.Empty;
    public string OtpauthUri { get; set; } = string.Empty;
}

public class TotpEnableResult
{
    public bool Enabled { get; set; }
    public List<string> RecoveryCodes { get; set; } = new();
}

public class TotpStatusResult
{
    public bool Enabled { get; set; }
    public DateTime? EnabledAt { get; set; }
    public int RemainingRecoveryCodes { get; set; }
}
