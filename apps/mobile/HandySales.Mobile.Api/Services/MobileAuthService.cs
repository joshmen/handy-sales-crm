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

        return new
        {
            user = new
            {
                id = usuario.Id.ToString(),
                email = usuario.Email,
                name = usuario.Nombre,
                role = role
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

        return new
        {
            user = new
            {
                id = tokenEntity.Usuario.Id.ToString(),
                email = tokenEntity.Usuario.Email,
                name = tokenEntity.Usuario.Nombre,
                role = tokenEntity.Usuario.EsAdmin ? "ADMIN" : "VENDEDOR"
            },
            token = newAccessToken,
            refreshToken = newRefreshToken.Token
        };
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
