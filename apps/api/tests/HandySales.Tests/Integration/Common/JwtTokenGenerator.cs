using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace HandySales.Tests.Integration.Common
{
    public class JwtTokenGeneratorTest
    {
        private readonly IConfiguration _config;

        public JwtTokenGeneratorTest(IConfiguration config)
        {
            _config = config;
        }

        public string GenerateToken(string userId, int tenantId)
        {
            // var key = "12345678901234567890123456789012"; // debe coincidir con tu appsettings.Test.json
            // var issuer = "TestIssuer";
            // var audience = "TestAudience";
            var key = _config["Jwt:Secret"];
            var issuer = _config["Jwt:Issuer"];
            var audience = _config["Jwt:Audience"];

            Console.WriteLine($"JWT KEY = '{key}', ISSUER = '{issuer}', AUDIENCE = '{audience}'");

            if (string.IsNullOrWhiteSpace(key))
                throw new InvalidOperationException("JWT Secret is null or empty.");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId),
                new Claim("tenant_id", tenantId.ToString()),
                // new Claim(JwtRegisteredClaimNames.Sub, "test-user"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
                // Agrega más claims si tu sistema los requiere
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
