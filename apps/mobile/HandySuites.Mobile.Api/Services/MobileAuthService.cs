using System.Security.Cryptography;
using HandySuites.Application.TwoFactor;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Security;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Services;

/// <summary>Login result to distinguish between auth failure and device binding rejection.</summary>
public class LoginResult
{
    public bool Success { get; init; }
    public bool DeviceBound { get; init; }
    /// <summary>True cuando el usuario tiene 2FA habilitado y el cliente debe
    /// llamar a /verify-totp con el código antes de obtener tokens.</summary>
    public bool TotpRequired { get; init; }
    public string? Message { get; init; }
    public object? Data { get; init; }
}

public class MobileAuthService
{
    private readonly HandySuitesDbContext _db;
    private readonly JwtTokenGenerator _jwt;
    private readonly ITotpVerifier _totpVerifier;

    public MobileAuthService(HandySuitesDbContext db, JwtTokenGenerator jwt, ITotpVerifier totpVerifier)
    {
        _db = db;
        _jwt = jwt;
        _totpVerifier = totpVerifier;
    }

    public async Task<LoginResult> LoginAsync(string email, string password, string? deviceId = null, string? deviceFingerprint = null, string? totpCode = null)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);

        var loginSuccess = usuario != null && BCrypt.Net.BCrypt.Verify(password, usuario.PasswordHash);

        if (!loginSuccess || usuario == null)
            return new LoginResult { Success = false };

        // Check if the user account is active
        if (!usuario.Activo)
            return new LoginResult { Success = false, Message = "Cuenta desactivada" };

        // VULN-M03 fix: si el usuario tiene 2FA habilitado, exigir código TOTP
        // antes de emitir tokens. Antes el mobile bypaseaba completamente la
        // verificación — un atacante con creds robadas pivoteaba al endpoint
        // mobile y obtenía full access ignorando el segundo factor.
        if (usuario.TotpEnabled)
        {
            if (string.IsNullOrEmpty(totpCode))
            {
                return new LoginResult
                {
                    Success = false,
                    TotpRequired = true,
                    Message = "Se requiere código de autenticación 2FA"
                };
            }

            var totpOk = await _totpVerifier.VerifyLoginCodeAsync(usuario.Id, totpCode);
            if (!totpOk)
            {
                // Fallback: aceptar recovery code (formato XXXX-XXXX). El
                // verifier marca el código como usado al consumirlo.
                var recoveryOk = await _totpVerifier.UseRecoveryCodeAsync(usuario.Id, totpCode);
                if (!recoveryOk)
                {
                    return new LoginResult
                    {
                        Success = false,
                        TotpRequired = true,
                        Message = "Código 2FA inválido"
                    };
                }
            }
        }

        // --- Device session management ---
        // Cambio 2026-04-28: el binding check ahora aplica aunque el cliente
        // NO mande fingerprint (caso APK viejo). Antes el if externo bypaseaba
        // la restriccion completa para esos clientes.
        DeviceSession? existingSession = null;
        if (!string.IsNullOrEmpty(deviceFingerprint) || !string.IsNullOrEmpty(deviceId))
        {
            // Find existing session by fingerprint or deviceId (reuse same device session)
            existingSession = await _db.DeviceSessions
                .IgnoreQueryFilters()
                .Where(ds => ds.UsuarioId == usuario.Id &&
                             ds.TenantId == usuario.TenantId &&
                             ds.EliminadoEn == null &&
                             (ds.Status == SessionStatus.Active || ds.Status == SessionStatus.LoggedOut))
                .OrderByDescending(ds => ds.LastActivity)
                .FirstOrDefaultAsync(ds =>
                    (!string.IsNullOrEmpty(deviceFingerprint) && ds.DeviceFingerprint == deviceFingerprint) ||
                    (!string.IsNullOrEmpty(deviceId) && ds.DeviceId == deviceId));
        }

        // Device binding check — only for non-admin users.
        // Reportado 2026-04-28: la version anterior tenia 3 escapes:
        // 1) Solo aplicaba si cliente mandaba fingerprint (el if externo)
        // 2) Excluia sesiones con fingerprint NULL (legacy)
        // 3) Permitia status LoggedOut como activo
        // Ahora la regla es: si EXISTE OTRA sesion Active del mismo usuario
        // (con o sin fingerprint), bloquear. Esto refuerza el modelo de
        // negocio "1 vendedor = 1 device".
        if (!usuario.IsAdminOrAbove && usuario.Rol != RoleNames.Supervisor)
        {
            var boundSession = await _db.DeviceSessions
                .IgnoreQueryFilters()
                .Where(ds => ds.UsuarioId == usuario.Id &&
                             ds.TenantId == usuario.TenantId &&
                             ds.EliminadoEn == null &&
                             ds.Status == SessionStatus.Active &&
                             (
                                 (!string.IsNullOrEmpty(ds.DeviceFingerprint)
                                   && ds.DeviceFingerprint != deviceFingerprint) ||
                                 (string.IsNullOrEmpty(ds.DeviceFingerprint)
                                   && !string.IsNullOrEmpty(ds.DeviceId)
                                   && (string.IsNullOrEmpty(deviceId) || ds.DeviceId != deviceId)) ||
                                 (string.IsNullOrEmpty(ds.DeviceFingerprint)
                                   && string.IsNullOrEmpty(ds.DeviceId))
                             ))
                .OrderByDescending(ds => ds.LastActivity)
                .FirstOrDefaultAsync();

            if (boundSession != null)
            {
                return new LoginResult
                {
                    Success = false,
                    DeviceBound = true,
                    Message = "Tu cuenta está activa en otro dispositivo. Por seguridad, solo se permite una sesión a la vez."
                };
            }
        }

        // Reuse existing session or create new one
        if (existingSession != null)
        {
            existingSession.DeviceFingerprint = deviceFingerprint;
            existingSession.DeviceId = deviceId ?? existingSession.DeviceId;
            existingSession.LastActivity = DateTime.UtcNow;
            existingSession.Status = SessionStatus.Active;
        }
        else if (!string.IsNullOrEmpty(deviceId))
        {
            _db.DeviceSessions.Add(new DeviceSession
            {
                TenantId = usuario.TenantId,
                UsuarioId = usuario.Id,
                DeviceId = deviceId,
                DeviceFingerprint = deviceFingerprint,
                DeviceName = null,
                DeviceType = DeviceType.Unknown,
                Status = SessionStatus.Active,
                LastActivity = DateTime.UtcNow,
                LoggedInAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        var token = _jwt.GenerateTokenWithRoles(usuario.Id.ToString(), usuario.TenantId, usuario.Rol);

        var (_, plainRefreshToken) = await CreateRefreshTokenAsync(usuario.Id);

        // Fetch company logo for the tenant (nullable)
        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == usuario.TenantId)
            .Select(cs => cs.LogoUrl)
            .FirstOrDefaultAsync();

        return new LoginResult
        {
            Success = true,
            Data = new
            {
                user = new
                {
                    id = usuario.Id.ToString(),
                    email = usuario.Email,
                    name = usuario.Nombre,
                    role = usuario.Rol,
                    tenantLogo = companyLogo ?? ""
                },
                token = token,
                refreshToken = plainRefreshToken
            }
        };
    }

    public async Task<object?> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
            return null;

        // Hash incoming token to compare with stored hash
        var tokenHash = HashToken(refreshToken);
        var tokenEntity = await _db.RefreshTokens
            .Include(rt => rt.Usuario)
            .FirstOrDefaultAsync(rt => rt.Token == tokenHash &&
                                     !rt.IsRevoked &&
                                     rt.ExpiresAt > DateTime.UtcNow);

        if (tokenEntity == null)
            return null;

        // Block deactivated users from refreshing tokens
        if (!tokenEntity.Usuario.Activo)
        {
            tokenEntity.IsRevoked = true;
            tokenEntity.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return null;
        }

        // 2FA enforcement on refresh: si el user habilitó 2FA POSTERIOR a la
        // creación del refresh token, invalidamos el token. El user tendrá que
        // hacer re-login (que ahora SÍ enforce TOTP — ver LoginAsync). Esto
        // cierra la ventana donde un token capturado antes del 2FA-enable
        // seguiría funcionando indefinidamente.
        if (tokenEntity.Usuario.TotpEnabled &&
            tokenEntity.Usuario.TotpEnabledAt.HasValue &&
            tokenEntity.Usuario.TotpEnabledAt.Value > tokenEntity.CreatedAt)
        {
            tokenEntity.IsRevoked = true;
            tokenEntity.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return null;
        }

        tokenEntity.IsRevoked = true;
        tokenEntity.RevokedAt = DateTime.UtcNow;

        var newAccessToken = _jwt.GenerateTokenWithRoles(
            tokenEntity.Usuario.Id.ToString(), tokenEntity.Usuario.TenantId,
            tokenEntity.Usuario.Rol);

        var (newTokenEntity, newPlainToken) = await CreateRefreshTokenAsync(tokenEntity.UserId);
        tokenEntity.ReplacedByToken = newTokenEntity.Token;

        await _db.SaveChangesAsync();

        // Fetch company logo for the tenant (nullable)
        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == tokenEntity.Usuario.TenantId)
            .Select(cs => cs.LogoUrl)
            .FirstOrDefaultAsync();

        return new
        {
            user = new
            {
                id = tokenEntity.Usuario.Id.ToString(),
                email = tokenEntity.Usuario.Email,
                name = tokenEntity.Usuario.Nombre,
                role = tokenEntity.Usuario.Rol,
                tenantLogo = companyLogo ?? ""
            },
            token = newAccessToken,
            refreshToken = newPlainToken
        };
    }

    public async Task RegisterDeviceTokenAsync(int userId, int tenantId, string pushToken, string platform, string deviceName, string? deviceId, string? deviceFingerprint)
    {
        var deviceType = platform.ToLowerInvariant() switch
        {
            "android" => DeviceType.Android,
            "ios" => DeviceType.iOS,
            _ => DeviceType.Unknown
        };

        // Find existing session for this user (prefer by fingerprint, then by deviceId, then by push token)
        var existingSession = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds =>
                ds.UsuarioId == userId &&
                ds.TenantId == tenantId &&
                ds.EliminadoEn == null &&
                ds.Status == SessionStatus.Active &&
                ((!string.IsNullOrEmpty(deviceFingerprint) && ds.DeviceFingerprint == deviceFingerprint) ||
                 (!string.IsNullOrEmpty(deviceId) && ds.DeviceId == deviceId) ||
                 ds.PushToken == pushToken));

        if (existingSession != null)
        {
            existingSession.LastActivity = DateTime.UtcNow;
            existingSession.DeviceName = deviceName;
            existingSession.DeviceType = deviceType;
            existingSession.PushToken = pushToken;
            existingSession.Status = SessionStatus.Active;
            if (!string.IsNullOrEmpty(deviceId))
                existingSession.DeviceId = deviceId;
            if (!string.IsNullOrEmpty(deviceFingerprint))
                existingSession.DeviceFingerprint = deviceFingerprint;
        }
        else
        {
            var session = new DeviceSession
            {
                TenantId = tenantId,
                UsuarioId = userId,
                DeviceId = deviceId ?? Guid.NewGuid().ToString(),
                DeviceFingerprint = deviceFingerprint,
                DeviceName = deviceName,
                DeviceType = deviceType,
                PushToken = pushToken,
                Status = SessionStatus.Active,
                LastActivity = DateTime.UtcNow,
                LoggedInAt = DateTime.UtcNow
            };
            _db.DeviceSessions.Add(session);
        }

        await _db.SaveChangesAsync();
    }

    public async Task AcknowledgeUnbindAsync(int userId, int tenantId, string? deviceFingerprint)
    {
        // Find the PendingUnbind session for this user
        var session = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds =>
                ds.UsuarioId == userId &&
                ds.TenantId == tenantId &&
                ds.EliminadoEn == null &&
                ds.Status == SessionStatus.PendingUnbind);

        if (session != null)
        {
            session.Status = SessionStatus.Unbound;
            session.LoggedOutAt = DateTime.UtcNow;
            session.LogoutReason = "Desvinculado por administrador (sync completado)";
        }

        // Revoke all refresh tokens for this user
        var tokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }

    private async Task<(RefreshToken Entity, string PlainToken)> CreateRefreshTokenAsync(int userId)
    {
        var existingTokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in existingTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        var plainToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var refreshToken = new RefreshToken
        {
            Token = HashToken(plainToken),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return (refreshToken, plainToken);
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hash);
    }

    /// <summary>
    /// Login forzado: ignora el check DEVICE_BOUND y revoca todas las sesiones
    /// activas del usuario excepto la que se va a crear. El cliente lo invoca
    /// solo despues de que el usuario confirma en un modal "Continuar aqui"
    /// tras recibir DEVICE_BOUND en el login normal. TOTP también se enforce
    /// aquí (VULN-M03) — force-login no puede ser un bypass del 2FA.
    /// </summary>
    public async Task<LoginResult> ForceLoginAsync(string email, string password, string? deviceId = null, string? deviceFingerprint = null, string? totpCode = null)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);
        var loginSuccess = usuario != null && BCrypt.Net.BCrypt.Verify(password, usuario.PasswordHash);
        if (!loginSuccess || usuario == null)
            return new LoginResult { Success = false };
        if (!usuario.Activo)
            return new LoginResult { Success = false, Message = "Cuenta desactivada" };

        // Mismo enforcement TOTP que LoginAsync — force-login NO debe bypass.
        if (usuario.TotpEnabled)
        {
            if (string.IsNullOrEmpty(totpCode))
            {
                return new LoginResult
                {
                    Success = false,
                    TotpRequired = true,
                    Message = "Se requiere código de autenticación 2FA"
                };
            }
            var totpOk = await _totpVerifier.VerifyLoginCodeAsync(usuario.Id, totpCode);
            if (!totpOk)
            {
                var recoveryOk = await _totpVerifier.UseRecoveryCodeAsync(usuario.Id, totpCode);
                if (!recoveryOk)
                {
                    return new LoginResult
                    {
                        Success = false,
                        TotpRequired = true,
                        Message = "Código 2FA inválido"
                    };
                }
            }
        }

        // Revocar TODAS las sesiones Active del usuario (incluida la actual si la
        // hubiera con otro fingerprint). El cliente las re-creara via la nueva.
        var activeSessions = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => ds.UsuarioId == usuario.Id &&
                         ds.TenantId == usuario.TenantId &&
                         ds.EliminadoEn == null &&
                         ds.Status == SessionStatus.Active)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var s in activeSessions)
        {
            s.Status = SessionStatus.RevokedByUser;
            s.LoggedOutAt = now;
            s.ActualizadoEn = now;
        }

        // Crear nueva sesion para el device actual (si tiene identificador).
        if (!string.IsNullOrEmpty(deviceId) || !string.IsNullOrEmpty(deviceFingerprint))
        {
            _db.DeviceSessions.Add(new DeviceSession
            {
                TenantId = usuario.TenantId,
                UsuarioId = usuario.Id,
                DeviceId = deviceId ?? string.Empty,
                DeviceFingerprint = deviceFingerprint,
                DeviceName = null,
                DeviceType = DeviceType.Unknown,
                Status = SessionStatus.Active,
                LastActivity = now,
                LoggedInAt = now
            });
        }

        await _db.SaveChangesAsync();

        var token = _jwt.GenerateTokenWithRoles(usuario.Id.ToString(), usuario.TenantId, usuario.Rol);
        var (_, plainRefreshToken) = await CreateRefreshTokenAsync(usuario.Id);

        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == usuario.TenantId)
            .Select(cs => cs.LogoUrl)
            .FirstOrDefaultAsync();

        return new LoginResult
        {
            Success = true,
            Data = new
            {
                user = new
                {
                    id = usuario.Id.ToString(),
                    email = usuario.Email,
                    name = usuario.Nombre,
                    role = usuario.Rol,
                    tenantLogo = companyLogo ?? ""
                },
                token = token,
                refreshToken = plainRefreshToken
            }
        };
    }
}
