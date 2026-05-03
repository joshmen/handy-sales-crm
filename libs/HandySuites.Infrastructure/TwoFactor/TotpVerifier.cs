using HandySuites.Application.TwoFactor;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Security;
using Microsoft.EntityFrameworkCore;
using OtpNet;

namespace HandySuites.Infrastructure.TwoFactor;

/// <summary>
/// Implementación compartida de verificación TOTP. Usada por el mobile API
/// (login enforcement) y el web API (login + sensitive operations). Solo
/// expone Verify — la generación de secret/recovery codes vive en
/// HandySuites.Api.TwoFactor.TotpService.
/// </summary>
public class TotpVerifier : ITotpVerifier
{
    private readonly HandySuitesDbContext _db;
    private readonly TotpEncryptionService _encryption;

    public TotpVerifier(HandySuitesDbContext db, TotpEncryptionService encryption)
    {
        _db = db;
        _encryption = encryption;
    }

    public async Task<bool> VerifyLoginCodeAsync(int userId, string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;

        var usuario = await _db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.Id == userId)
            .Select(u => new { u.TotpSecretEncrypted, u.TotpEnabled })
            .FirstOrDefaultAsync();

        if (usuario == null || !usuario.TotpEnabled || string.IsNullOrEmpty(usuario.TotpSecretEncrypted))
            return false;

        var base32Secret = _encryption.Decrypt(usuario.TotpSecretEncrypted);
        var secretBytes = Base32Encoding.ToBytes(base32Secret);
        var totp = new Totp(secretBytes, step: 30, totpSize: 6);
        return totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));
    }

    public async Task<bool> UseRecoveryCodeAsync(int userId, string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;

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
}
