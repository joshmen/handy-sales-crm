using FluentAssertions;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Security;
using HandySales.Application.ActivityTracking.Services;
using HandySales.Application.CompanySettings.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using Xunit;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Tests.Integration.Auth
{
    public class AuthServiceTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HandySalesDbContext _db;
        private readonly JwtTokenGenerator _jwt;
        private readonly AuthService _authService;
        private readonly IActivityTrackingService _activityTracking;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ICloudinaryService _cloudinaryService;

        public AuthServiceTests(CustomWebApplicationFactory factory)
        {
            var scope = factory.Services.CreateScope();
            _db = scope.ServiceProvider.GetRequiredService<HandySalesDbContext>();
            _jwt = scope.ServiceProvider.GetRequiredService<JwtTokenGenerator>();
            _activityTracking = scope.ServiceProvider.GetRequiredService<IActivityTrackingService>();
            _httpContextAccessor = scope.ServiceProvider.GetRequiredService<IHttpContextAccessor>();
            _cloudinaryService = scope.ServiceProvider.GetRequiredService<ICloudinaryService>();
            _authService = new AuthService(_db, _jwt, _activityTracking, _httpContextAccessor, scope.ServiceProvider, _cloudinaryService);
        }

        [Fact]
        public async Task RegisterAsync_DeberiaCrearUsuarioYRetornarTrue()
        {
            var dto = new UsuarioRegisterDto
            {
                Email = $"test{Guid.NewGuid():N}@example.com",
                Password = "Test1234",
                Nombre = "Test User",
                NombreEmpresa = "Empresa Demo"
            };

            var result = await _authService.RegisterAsync(dto);

            result.Should().BeTrue();
            _db.Usuarios.Any(u => u.Email == dto.Email).Should().BeTrue();
            _db.Tenants.Any(t => t.NombreEmpresa == dto.NombreEmpresa).Should().BeTrue();
        }

        [Fact]
        public async Task LoginAsync_DeberiaRetornarToken_CuandoCredencialesSonValidas()
        {
            var email = $"test{Guid.NewGuid():N}@example.com";
            var password = "Secret123";

            var dto = new UsuarioRegisterDto
            {
                Email = email,
                Password = password,
                Nombre = "Nombre",
                NombreEmpresa = "Empresa SA"
            };
            await _authService.RegisterAsync(dto);

            var loginDto = new UsuarioLoginDto
            {
                email = email,
                password = password
            };

            var token = await _authService.LoginAsync(loginDto);

            token.Should().NotBeNull();
        }

        [Fact]
        public async Task LoginAsync_DeberiaRegistrarActivityLog_CuandoLoginEsExitoso()
        {
            // Arrange
            var email = $"test{Guid.NewGuid():N}@example.com";
            var password = "TestPassword123";

            var registerDto = new UsuarioRegisterDto
            {
                Email = email,
                Password = password,
                Nombre = "Test User",
                NombreEmpresa = "Test Company"
            };
            await _authService.RegisterAsync(registerDto);

            var loginDto = new UsuarioLoginDto
            {
                email = email,
                password = password
            };

            // Act
            var result = await _authService.LoginAsync(loginDto);

            // Assert
            result.Should().NotBeNull();

            // Verificar que se creó un ActivityLog para el login exitoso
            var activityLogs = await _db.ActivityLogs
                .Where(a => a.ActivityType == "login" && a.ActivityStatus == "success")
                .ToListAsync();

            activityLogs.Should().NotBeEmpty();
            var loginActivity = activityLogs.FirstOrDefault(a => a.Description.Contains(email));
            loginActivity.Should().NotBeNull();
            loginActivity.ActivityCategory.Should().Be("auth");
            loginActivity.ActivityType.Should().Be("login");
            loginActivity.ActivityStatus.Should().Be("success");
        }

        [Fact]
        public async Task LoginAsync_DeberiaRegistrarActivityLog_CuandoLoginFalla()
        {
            // Arrange
            var email = $"test{Guid.NewGuid():N}@example.com";
            var wrongPassword = "WrongPassword";

            // Crear usuario primero
            var registerDto = new UsuarioRegisterDto
            {
                Email = email,
                Password = "CorrectPassword",
                Nombre = "Test User",
                NombreEmpresa = "Test Company"
            };
            await _authService.RegisterAsync(registerDto);

            var loginDto = new UsuarioLoginDto
            {
                email = email,
                password = wrongPassword
            };

            // Act
            var result = await _authService.LoginAsync(loginDto);

            // Assert
            result.Should().BeNull();

            // Verificar que se creó un ActivityLog para el login fallido
            var failedActivityLogs = await _db.ActivityLogs
                .Where(a => a.ActivityType == "login" && a.ActivityStatus == "failed")
                .ToListAsync();

            failedActivityLogs.Should().NotBeEmpty();
            var failedLoginActivity = failedActivityLogs.FirstOrDefault(a => a.Description.Contains(email));
            failedLoginActivity.Should().NotBeNull();
            failedLoginActivity.ActivityCategory.Should().Be("auth");
            failedLoginActivity.ActivityType.Should().Be("login");
            failedLoginActivity.ActivityStatus.Should().Be("failed");
        }

        [Fact]
        public async Task LoginAsync_NoDeberiaRegistrarActivityLog_CuandoUsuarioNoExiste()
        {
            // Arrange
            var nonExistentEmail = $"nonexistent{Guid.NewGuid():N}@example.com";
            var loginDto = new UsuarioLoginDto
            {
                email = nonExistentEmail,
                password = "AnyPassword"
            };

            var initialActivityCount = await _db.ActivityLogs.CountAsync();

            // Act
            var result = await _authService.LoginAsync(loginDto);

            // Assert
            result.Should().BeNull();

            // No se debería haber registrado ningún ActivityLog porque el usuario no existe
            var finalActivityCount = await _db.ActivityLogs.CountAsync();
            finalActivityCount.Should().Be(initialActivityCount);
        }

        [Fact]
        public async Task RefreshTokenAsync_DeberiaCrearNuevoRefreshToken_CuandoTokenEsValido()
        {
            // Arrange - Crear usuario y hacer login para obtener refresh token
            var email = $"test{Guid.NewGuid():N}@example.com";
            var password = "TestPassword123";
            var registerDto = new UsuarioRegisterDto
            {
                Email = email,
                Password = password,
                Nombre = "Test User",
                NombreEmpresa = "Test Company"
            };
            await _authService.RegisterAsync(registerDto);

            var loginDto = new UsuarioLoginDto
            {
                email = email,
                password = password
            };
            var loginResult = await _authService.LoginAsync(loginDto);
            
            // Extraer refresh token del resultado del login
            var loginResultType = loginResult.GetType();
            var refreshTokenProperty = loginResultType.GetProperty("refreshToken");
            var refreshToken = refreshTokenProperty?.GetValue(loginResult)?.ToString();

            refreshToken.Should().NotBeNullOrEmpty();

            // Act
            var refreshResult = await _authService.RefreshTokenAsync(refreshToken);

            // Assert
            refreshResult.Should().NotBeNull();
            
            // Verificar que el token anterior fue revocado
            var oldToken = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken);
            oldToken.Should().NotBeNull();
            oldToken.IsRevoked.Should().BeTrue();
        }

        [Fact]
        public async Task RefreshTokenAsync_DeberiaRetornarNull_CuandoTokenNoEsValido()
        {
            // Arrange
            var invalidToken = "invalid-refresh-token";

            // Act
            var result = await _authService.RefreshTokenAsync(invalidToken);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task RefreshTokenAsync_DeberiaRetornarNull_CuandoTokenEstaRevocado()
        {
            // Arrange - Crear un refresh token revocado
            var usuario = await _db.Usuarios.FirstOrDefaultAsync();
            if (usuario == null)
            {
                var registerDto = new UsuarioRegisterDto
                {
                    Email = $"test{Guid.NewGuid():N}@example.com",
                    Password = "TestPassword",
                    Nombre = "Test User",
                    NombreEmpresa = "Test Company"
                };
                await _authService.RegisterAsync(registerDto);
                usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == registerDto.Email);
            }

            var revokedToken = new HandySales.Domain.Entities.RefreshToken
            {
                Token = "revoked-token",
                UserId = usuario.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(30),
                CreatedAt = DateTime.UtcNow,
                IsRevoked = true,
                RevokedAt = DateTime.UtcNow
            };

            _db.RefreshTokens.Add(revokedToken);
            await _db.SaveChangesAsync();

            // Act
            var result = await _authService.RefreshTokenAsync("revoked-token");

            // Assert
            result.Should().BeNull();
        }
    }

}
