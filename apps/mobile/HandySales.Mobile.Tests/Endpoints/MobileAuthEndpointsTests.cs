using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Mobile.Api.Services;
using HandySales.Shared.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HandySales.Mobile.Tests.Endpoints;

public class MobileAuthEndpointsTests : IDisposable
{
    private readonly HandySalesDbContext _db;
    private readonly MobileAuthService _authService;
    private readonly JwtTokenGenerator _jwtGenerator;

    public MobileAuthEndpointsTests()
    {
        var options = new DbContextOptionsBuilder<HandySalesDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new HandySalesDbContext(options);

        var jwtOptions = Options.Create(new JwtSettings
        {
            Secret = "test-secret-key-that-is-at-least-32-characters-long-for-testing",
            Issuer = "HandySales.Test",
            Audience = "HandySales.Test",
            ExpirationMinutes = 60
        });

        _jwtGenerator = new JwtTokenGenerator(jwtOptions);
        _authService = new MobileAuthService(_db, _jwtGenerator);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Test123!");

        var tenant = new Tenant
        {
            Id = 1,
            NombreEmpresa = "Test Tenant",
            RFC = "XAXX010101000"
        };
        _db.Tenants.Add(tenant);

        var usuario = new Usuario
        {
            Id = 1,
            Nombre = "Test Vendedor",
            Email = "vendedor@test.com",
            PasswordHash = passwordHash,
            TenantId = 1,
            EsAdmin = false,
            EsSuperAdmin = false,
            Activo = true
        };
        _db.Usuarios.Add(usuario);

        var admin = new Usuario
        {
            Id = 2,
            Nombre = "Test Admin",
            Email = "admin@test.com",
            PasswordHash = passwordHash,
            TenantId = 1,
            EsAdmin = true,
            EsSuperAdmin = false,
            Activo = true
        };
        _db.Usuarios.Add(admin);

        _db.SaveChanges();
    }

    [Fact]
    public async Task LoginAsync_ReturnsNull_ForInvalidCredentials()
    {
        // Act
        var result = await _authService.LoginAsync("invalid@test.com", "wrongpassword");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_ReturnsNull_ForWrongPassword()
    {
        // Act
        var result = await _authService.LoginAsync("vendedor@test.com", "wrongpassword");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_ReturnsTokens_ForValidCredentials()
    {
        // Act
        var result = await _authService.LoginAsync("vendedor@test.com", "Test123!");

        // Assert
        result.Should().NotBeNull();

        var resultType = result!.GetType();
        var tokenProp = resultType.GetProperty("token");
        var refreshTokenProp = resultType.GetProperty("refreshToken");
        var userProp = resultType.GetProperty("user");

        tokenProp.Should().NotBeNull();
        refreshTokenProp.Should().NotBeNull();
        userProp.Should().NotBeNull();

        var token = tokenProp!.GetValue(result) as string;
        var refreshToken = refreshTokenProp!.GetValue(result) as string;

        token.Should().NotBeNullOrEmpty();
        refreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task LoginAsync_ReturnsVendedorRole_ForNonAdminUser()
    {
        // Act
        var result = await _authService.LoginAsync("vendedor@test.com", "Test123!");

        // Assert
        result.Should().NotBeNull();

        var userProp = result!.GetType().GetProperty("user");
        var user = userProp!.GetValue(result);
        var roleProp = user!.GetType().GetProperty("role");
        var role = roleProp!.GetValue(user) as string;

        role.Should().Be("VENDEDOR");
    }

    [Fact]
    public async Task LoginAsync_ReturnsAdminRole_ForAdminUser()
    {
        // Act
        var result = await _authService.LoginAsync("admin@test.com", "Test123!");

        // Assert
        result.Should().NotBeNull();

        var userProp = result!.GetType().GetProperty("user");
        var user = userProp!.GetValue(result);
        var roleProp = user!.GetType().GetProperty("role");
        var role = roleProp!.GetValue(user) as string;

        role.Should().Be("ADMIN");
    }

    [Fact]
    public async Task LoginAsync_CreatesRefreshToken_InDatabase()
    {
        // Act
        await _authService.LoginAsync("vendedor@test.com", "Test123!");

        // Assert
        var refreshToken = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.UserId == 1);
        refreshToken.Should().NotBeNull();
        refreshToken!.IsRevoked.Should().BeFalse();
        refreshToken.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task RefreshTokenAsync_ReturnsNull_ForEmptyToken()
    {
        // Act
        var result = await _authService.RefreshTokenAsync("");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task RefreshTokenAsync_ReturnsNull_ForInvalidToken()
    {
        // Act
        var result = await _authService.RefreshTokenAsync("invalid-token-string");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task RefreshTokenAsync_ReturnsNewTokens_ForValidToken()
    {
        // Arrange
        var loginResult = await _authService.LoginAsync("vendedor@test.com", "Test123!");
        var refreshTokenProp = loginResult!.GetType().GetProperty("refreshToken");
        var originalRefreshToken = refreshTokenProp!.GetValue(loginResult) as string;

        // Act
        var result = await _authService.RefreshTokenAsync(originalRefreshToken!);

        // Assert
        result.Should().NotBeNull();

        var newTokenProp = result!.GetType().GetProperty("token");
        var newRefreshTokenProp = result.GetType().GetProperty("refreshToken");

        var newToken = newTokenProp!.GetValue(result) as string;
        var newRefreshToken = newRefreshTokenProp!.GetValue(result) as string;

        newToken.Should().NotBeNullOrEmpty();
        newRefreshToken.Should().NotBeNullOrEmpty();
        newRefreshToken.Should().NotBe(originalRefreshToken);
    }

    [Fact]
    public async Task RefreshTokenAsync_RevokesOldToken_WhenRefreshing()
    {
        // Arrange
        var loginResult = await _authService.LoginAsync("vendedor@test.com", "Test123!");
        var refreshTokenProp = loginResult!.GetType().GetProperty("refreshToken");
        var originalRefreshToken = refreshTokenProp!.GetValue(loginResult) as string;

        // Act
        await _authService.RefreshTokenAsync(originalRefreshToken!);

        // Assert
        var oldToken = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == originalRefreshToken);
        oldToken.Should().NotBeNull();
        oldToken!.IsRevoked.Should().BeTrue();
        oldToken.RevokedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RefreshTokenAsync_ReturnsNull_ForRevokedToken()
    {
        // Arrange
        var loginResult = await _authService.LoginAsync("vendedor@test.com", "Test123!");
        var refreshTokenProp = loginResult!.GetType().GetProperty("refreshToken");
        var originalRefreshToken = refreshTokenProp!.GetValue(loginResult) as string;

        // Use the token once (which revokes it)
        await _authService.RefreshTokenAsync(originalRefreshToken!);

        // Act - try to use the revoked token again
        var result = await _authService.RefreshTokenAsync(originalRefreshToken!);

        // Assert
        result.Should().BeNull();
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
