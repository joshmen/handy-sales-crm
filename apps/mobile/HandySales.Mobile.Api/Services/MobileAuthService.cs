using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Security;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Mobile.Api.Services;

public class MobileAuthService
{
    private readonly HandySalesDbContext _db;
    private readonly JwtTokenGenerator _jwt;

    public MobileAuthService(HandySalesDbContext db, JwtTokenGenerator jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<object?> LoginAsync(string email, string password)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);

        var loginSuccess = usuario != null && BCrypt.Net.BCrypt.Verify(password, usuario.PasswordHash);

        if (!loginSuccess || usuario == null)
            return null;

        var token = _jwt.GenerateTokenWithRoles(usuario.Id.ToString(), usuario.TenantId, usuario.EsAdmin, usuario.EsSuperAdmin);

        var refreshToken = await CreateRefreshTokenAsync(usuario.Id);

        var role = usuario.EsSuperAdmin ? "SUPER_ADMIN" : (usuario.EsAdmin ? "ADMIN" : "VENDEDOR");

        // Fetch company logo for the tenant (nullable)
        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == usuario.TenantId)
            .Select(cs => cs.CompanyLogo)
            .FirstOrDefaultAsync();

        return new
        {
            user = new
            {
                id = usuario.Id.ToString(),
                email = usuario.Email,
                name = usuario.Nombre,
                role = role,
                tenantLogo = companyLogo
            },
            token = token,
            refreshToken = refreshToken.Token
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

        var newAccessToken = _jwt.GenerateToken(tokenEntity.Usuario.Id.ToString(), tokenEntity.Usuario.TenantId);

        var newRefreshToken = await CreateRefreshTokenAsync(tokenEntity.UserId);
        tokenEntity.ReplacedByToken = newRefreshToken.Token;

        await _db.SaveChangesAsync();

        // Fetch company logo for the tenant (nullable)
        var companyLogo = await _db.CompanySettings
            .AsNoTracking()
            .Where(cs => cs.TenantId == tokenEntity.Usuario.TenantId)
            .Select(cs => cs.CompanyLogo)
            .FirstOrDefaultAsync();

        return new
        {
            user = new
            {
                id = tokenEntity.Usuario.Id.ToString(),
                email = tokenEntity.Usuario.Email,
                name = tokenEntity.Usuario.Nombre,
                role = tokenEntity.Usuario.EsAdmin ? "ADMIN" : "VENDEDOR",
                tenantLogo = companyLogo
            },
            token = newAccessToken,
            refreshToken = newRefreshToken.Token
        };
    }

    public async Task RegisterDeviceTokenAsync(int userId, int tenantId, string pushToken, string platform, string deviceName)
    {
        var deviceType = platform.ToLowerInvariant() switch
        {
            "android" => DeviceType.Android,
            "ios" => DeviceType.iOS,
            _ => DeviceType.Unknown
        };

        // Find existing session for this user+push token combo, or any session for this user on same platform
        var existingSession = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ds =>
                ds.UsuarioId == userId &&
                ds.TenantId == tenantId &&
                ds.PushToken == pushToken &&
                ds.EliminadoEn == null);

        if (existingSession != null)
        {
            existingSession.LastActivity = DateTime.UtcNow;
            existingSession.DeviceName = deviceName;
            existingSession.Status = SessionStatus.Active;
        }
        else
        {
            var session = new DeviceSession
            {
                TenantId = tenantId,
                UsuarioId = userId,
                DeviceId = Guid.NewGuid().ToString(),
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
