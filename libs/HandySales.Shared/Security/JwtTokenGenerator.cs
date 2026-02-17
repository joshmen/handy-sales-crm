using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;
using System.Text;


namespace HandySales.Shared.Security;

public class JwtTokenGenerator
{
    private readonly JwtSettings _settings;

    public JwtTokenGenerator(IOptions<JwtSettings> options)
    {
        _settings = options.Value;
    }

    public string GenerateToken(string userId, int tenantId)
    {
        return GenerateTokenWithRoles(userId, tenantId, false, false);
    }

    public string GenerateTokenWithRoles(string userId, int tenantId, bool isAdmin, bool isSuperAdmin)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim("tenant_id", tenantId.ToString()),
            new Claim("es_admin", isAdmin.ToString()),
            new Claim("es_super_admin", isSuperAdmin.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // Add role claims for easier access
        if (isSuperAdmin)
            claims.Add(new Claim(ClaimTypes.Role, "SUPER_ADMIN"));
        else if (isAdmin)
            claims.Add(new Claim(ClaimTypes.Role, "ADMIN"));
        else
            claims.Add(new Claim(ClaimTypes.Role, "VENDEDOR"));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_settings.ExpirationMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Genera un token temporal para impersonación de un tenant.
    /// Incluye claims adicionales para auditoría.
    /// </summary>
    public string GenerateImpersonationToken(
        string superAdminUserId,
        int targetTenantId,
        Guid impersonationSessionId,
        string accessLevel,
        int expirationMinutes = 60)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, superAdminUserId),
            new Claim("tenant_id", targetTenantId.ToString()),
            new Claim("es_admin", "true"),
            new Claim("es_super_admin", "true"),
            new Claim(ClaimTypes.Role, "SUPER_ADMIN"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            // Claims de impersonación
            new Claim("impersonation_session_id", impersonationSessionId.ToString()),
            new Claim("is_impersonating", "true"),
            new Claim("impersonation_access_level", accessLevel),
            new Claim("original_user_id", superAdminUserId)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
