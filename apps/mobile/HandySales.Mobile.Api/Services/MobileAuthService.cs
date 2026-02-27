using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Security;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Mobile.Api.Services;

/// <summary>Login result to distinguish between auth failure and device binding rejection.</summary>
public class LoginResult
{
    public bool Success { get; init; }
    public bool DeviceBound { get; init; }
    public string? Message { get; init; }
    public object? Data { get; init; }
}

public class MobileAuthService
{
    private readonly HandySalesDbContext _db;
    private readonly JwtTokenGenerator _jwt;

    public MobileAuthService(HandySalesDbContext db, JwtTokenGenerator jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<LoginResult> LoginAsync(string email, string password, string? deviceId = null, string? deviceFingerprint = null)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);

        var loginSuccess = usuario != null && BCrypt.Net.BCrypt.Verify(password, usuario.PasswordHash);

        if (!loginSuccess || usuario == null)
            return new LoginResult { Success = false };

        // --- Device binding check (only for non-admin mobile users) ---
        if (!string.IsNullOrEmpty(deviceFingerprint) && !usuario.EsAdmin && !usuario.EsSuperAdmin)
        {
            var existingSession = await _db.DeviceSessions
                .IgnoreQueryFilters()
                .Where(ds => ds.UsuarioId == usuario.Id &&
                             ds.TenantId == usuario.TenantId &&
                             ds.EliminadoEn == null &&
                             (ds.Status == SessionStatus.Active || ds.Status == SessionStatus.LoggedOut))
                .OrderByDescending(ds => ds.LastActivity)
                .FirstOrDefaultAsync();

            if (existingSession != null &&
                !string.IsNullOrEmpty(existingSession.DeviceFingerprint) &&
                existingSession.DeviceFingerprint != deviceFingerprint)
            {
                // Different device — reject login
                return new LoginResult
                {
                    Success = false,
                    DeviceBound = true,
                    Message = "Esta cuenta está vinculada a otro dispositivo. Contacta a tu administrador para desvincular."
                };
            }

            // Same device or first login — update/create session
            if (existingSession != null)
            {
                existingSession.DeviceFingerprint = deviceFingerprint;
                existingSession.DeviceId = deviceId ?? existingSession.DeviceId;
                existingSession.LastActivity = DateTime.UtcNow;
                existingSession.Status = SessionStatus.Active;
            }
            else if (!string.IsNullOrEmpty(deviceId))
            {
                // First login — create device session with fingerprint
                _db.DeviceSessions.Add(new DeviceSession
                {
                    TenantId = usuario.TenantId,
                    UsuarioId = usuario.Id,
                    DeviceId = deviceId,
                    DeviceFingerprint = deviceFingerprint,
                    DeviceName = null, // Will be set by RegisterDeviceTokenAsync
                    DeviceType = DeviceType.Unknown, // Will be set by RegisterDeviceTokenAsync
                    Status = SessionStatus.Active,
                    LastActivity = DateTime.UtcNow,
                    LoggedInAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
        }

        var token = _jwt.GenerateTokenWithRoles(usuario.Id.ToString(), usuario.TenantId, usuario.Rol);

        var refreshToken = await CreateRefreshTokenAsync(usuario.Id);

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
                    tenantLogo = companyLogo
                },
                token = token,
                refreshToken = refreshToken.Token
            }
        };
    }

    public async Task<object?> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
            return null;

        var tokenEntity = await _db.RefreshTokens
            .Include(rt => rt.Usuario)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken &&
                                     !rt.IsRevoked &&
                                     rt.ExpiresAt > DateTime.UtcNow);

        if (tokenEntity == null)
            return null;

        tokenEntity.IsRevoked = true;
        tokenEntity.RevokedAt = DateTime.UtcNow;

        var newAccessToken = _jwt.GenerateTokenWithRoles(
            tokenEntity.Usuario.Id.ToString(), tokenEntity.Usuario.TenantId,
            tokenEntity.Usuario.Rol);

        var newRefreshToken = await CreateRefreshTokenAsync(tokenEntity.UserId);
        tokenEntity.ReplacedByToken = newRefreshToken.Token;

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
                tenantLogo = companyLogo
            },
            token = newAccessToken,
            refreshToken = newRefreshToken.Token
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

        // Find existing session for this user (prefer by fingerprint, then by push token)
        var existingSession = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds =>
                ds.UsuarioId == userId &&
                ds.TenantId == tenantId &&
                ds.EliminadoEn == null &&
                ((!string.IsNullOrEmpty(deviceFingerprint) && ds.DeviceFingerprint == deviceFingerprint) ||
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

    private async Task<RefreshToken> CreateRefreshTokenAsync(int userId)
    {
        var existingTokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in existingTokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        var refreshToken = new RefreshToken
        {
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return refreshToken;
    }
}
