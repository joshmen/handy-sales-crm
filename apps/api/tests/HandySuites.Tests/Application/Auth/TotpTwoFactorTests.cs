using System.Text.Json;
using FluentAssertions;
using HandySuites.Api.TwoFactor;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OtpNet;
using Xunit;

namespace HandySuites.Tests.Application.Auth;

/// <summary>
/// Cobertura de TOTP/2FA: setup, verificacion de OTP valido/invalido, lockout por fuerza bruta.
///
/// Casos probados:
///   (a) GenerateSetupAsync — genera secreto y lo persiste encriptado; retorna QR + URI.
///   (b) EnableAsync con OTP valido — habilita 2FA y genera recovery codes.
///   (c) EnableAsync con OTP invalido — lanza InvalidOperationException.
///   (d) Verify2FAAsync con OTP valido — autenticacion completa exitosa.
///   (e) Verify2FAAsync con OTP invalido — retorna null y acumula contador.
///   (f) Lockout tras MaxTotpAttempts (5) intentos fallidos.
///   (g) Verify2FAAsync con recovery code valido — uso exitoso y marcado como usado.
///   (h) DisableAsync con OTP valido — deshabilita 2FA y borra recovery codes.
///   (i) GetStatusAsync — refleja estado correcto pre/post habilitacion.
///
/// NOTA sobre aislamiento del lockout:
///   _totpAttempts es un ConcurrentDictionary ESTATICO en AuthService (process-scoped).
///   Cada test crea usuarios con IDs unicos asignados por la DB (autoincrement), por lo
///   que las entradas en el diccionario son per-userId y no hay contaminacion entre tests.
///   Sin embargo, si el mismo userId se reutilizara entre tests o si hubiera paralelismo
///   real sobre el mismo userId, se produciria interferencia. El refactor correcto seria
///   mover _totpAttempts a IMemoryCache (scoped-per-request o keyed cache) — eso es un
///   follow-up separado (ver tasks/todo.md PLAN-015).
///
/// Reusa CustomWebApplicationFactory (SQLite in-memory) — mismo patron que SessionLockoutTests.
/// </summary>
public class TotpTwoFactorTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public TotpTwoFactorTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// <summary>
    /// Crea un usuario fresco con EmailVerificado=true y TotpEnabled=false.
    /// </summary>
    private async Task<Usuario> CreateFreshUserAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

        var user = new Usuario
        {
            Email = $"totp-{Guid.NewGuid():N}@test.com",
            Nombre = "TOTP Test User",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"),
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            TenantId = 1,
            RolExplicito = "VENDEDOR",
            EmailVerificado = true,
            TotpEnabled = false
        };
        db.Usuarios.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    /// <summary>
    /// Recarga el usuario desde una scope fresca para ver el estado persistido.
    /// </summary>
    private async Task<Usuario> ReloadUserAsync(int userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
        return await db.Usuarios.IgnoreQueryFilters().FirstAsync(u => u.Id == userId);
    }

    /// <summary>
    /// Resuelve TotpService desde una scope fresca (mirror de la request scoping).
    /// </summary>
    private TotpService ResolveTotpService(IServiceScope scope)
        => scope.ServiceProvider.GetRequiredService<TotpService>();

    /// <summary>
    /// Resuelve AuthService desde una scope fresca.
    /// </summary>
    private AuthService ResolveAuthService(IServiceScope scope)
        => scope.ServiceProvider.GetRequiredService<AuthService>();

    /// <summary>
    /// Computa el OTP valido actual usando OtpNet con el mismo secreto Base32 que usa
    /// TotpService. Permite generar codigos validos en tests sin depender de reloj real.
    /// </summary>
    private static string ComputeCurrentOtp(string base32Secret)
    {
        var secretBytes = Base32Encoding.ToBytes(base32Secret);
        var totp = new Totp(secretBytes, step: 30, totpSize: 6);
        return totp.ComputeTotp();
    }

    /// <summary>
    /// Extrae el secreto Base32 del otpauthUri devuelto por GenerateSetupAsync.
    /// Formato: otpauth://totp/...?secret=BASE32SECRET&...
    /// </summary>
    private static string ExtractSecretFromUri(string otpauthUri)
    {
        var uri = new Uri(otpauthUri);
        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        var secret = query["secret"];
        secret.Should().NotBeNullOrEmpty("el URI de setup debe incluir el parametro secret");
        return secret!;
    }

    // -----------------------------------------------------------------------
    // (a) GenerateSetupAsync — generacion de secreto TOTP
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GenerateSetupAsync_DeberiaRetornarQrYUri_YPersistirSecretoEncriptado()
    {
        // Arrange
        var user = await CreateFreshUserAsync();

        using var scope = _factory.Services.CreateScope();
        var totpSvc = ResolveTotpService(scope);

        // Act
        var result = await totpSvc.GenerateSetupAsync(user.Id);

        // Assert — resultado completo
        result.Should().NotBeNull();
        result.QrCodeBase64.Should().NotBeNullOrEmpty("debe incluir QR como base64");
        result.ManualKey.Should().NotBeNullOrEmpty("debe incluir clave manual para ingresar a mano");
        result.OtpauthUri.Should().StartWith("otpauth://totp/", "URI debe ser formato standard TOTP");
        result.OtpauthUri.Should().Contain("secret=", "URI debe incluir el secreto");

        // Assert — el secreto fue persistido encriptado en la DB
        var reloaded = await ReloadUserAsync(user.Id);
        reloaded.TotpSecretEncrypted.Should().NotBeNullOrEmpty(
            "el secreto debe quedar almacenado encriptado para que enable/verify funcionen");
        reloaded.TotpEnabled.Should().BeFalse("setup NO habilita 2FA todavia — requiere verificacion");
    }

    [Fact]
    public async Task GenerateSetupAsync_DeberiaLanzarExcepcion_CuandoUsuarioNoExiste()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var totpSvc = ResolveTotpService(scope);

        // Act & Assert
        await totpSvc.Invoking(s => s.GenerateSetupAsync(int.MaxValue))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Usuario no encontrado*");
    }

    [Fact]
    public async Task GenerateSetupAsync_DeberiaLanzarExcepcion_CuandoYaEsta2FAHabilitado()
    {
        // Arrange — usuario con TotpEnabled=true
        var user = await CreateFreshUserAsync();

        // Habilitar 2FA directamente en DB (simula estado post-enable)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var u = await db.Usuarios.IgnoreQueryFilters().FirstAsync(x => x.Id == user.Id);
            u.TotpEnabled = true;
            u.TotpSecretEncrypted = "already-set";
            await db.SaveChangesAsync();
        }

        // Act & Assert
        using var scope2 = _factory.Services.CreateScope();
        var totpSvc = ResolveTotpService(scope2);

        await totpSvc.Invoking(s => s.GenerateSetupAsync(user.Id))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*2FA ya está habilitado*");
    }

    // -----------------------------------------------------------------------
    // (b) EnableAsync con OTP valido
    // -----------------------------------------------------------------------

    [Fact]
    public async Task EnableAsync_DeberiaHabilitar2FA_CuandoOtpEsValido()
    {
        // Arrange — ejecutar setup primero para tener el secreto
        var user = await CreateFreshUserAsync();

        string base32Secret;
        using (var scope = _factory.Services.CreateScope())
        {
            var totpSvc = ResolveTotpService(scope);
            var setup = await totpSvc.GenerateSetupAsync(user.Id);
            base32Secret = ExtractSecretFromUri(setup.OtpauthUri);
        }

        var validOtp = ComputeCurrentOtp(base32Secret);

        // Act
        TotpEnableResult result;
        using (var scope = _factory.Services.CreateScope())
        {
            var totpSvc = ResolveTotpService(scope);
            result = await totpSvc.EnableAsync(user.Id, validOtp);
        }

        // Assert — resultado
        result.Should().NotBeNull();
        result.Enabled.Should().BeTrue();
        result.RecoveryCodes.Should().HaveCount(10, "se generan exactamente 10 recovery codes");
        result.RecoveryCodes.All(c => c.Contains('-')).Should().BeTrue(
            "cada recovery code tiene formato XXXX-XXXX");

        // Assert — estado persistido en DB
        var reloaded = await ReloadUserAsync(user.Id);
        reloaded.TotpEnabled.Should().BeTrue();
        reloaded.TotpEnabledAt.Should().NotBeNull();

        // Recovery codes deben estar en la DB como hashes BCrypt
        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
        var storedCodes = await db2.Set<TwoFactorRecoveryCode>()
            .Where(rc => rc.UsuarioId == user.Id)
            .ToListAsync();
        storedCodes.Should().HaveCount(10);
        storedCodes.All(rc => rc.UsedAt == null).Should().BeTrue("todos listos para usar");
    }

    // -----------------------------------------------------------------------
    // (c) EnableAsync con OTP invalido
    // -----------------------------------------------------------------------

    [Fact]
    public async Task EnableAsync_DeberiaLanzarExcepcion_CuandoOtpEsInvalido()
    {
        // Arrange
        var user = await CreateFreshUserAsync();

        using (var scope = _factory.Services.CreateScope())
        {
            var totpSvc = ResolveTotpService(scope);
            await totpSvc.GenerateSetupAsync(user.Id);
        }

        // Act & Assert
        using var scope2 = _factory.Services.CreateScope();
        var totpSvc2 = ResolveTotpService(scope2);

        await totpSvc2.Invoking(s => s.EnableAsync(user.Id, "000000"))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Código inválido*");

        // 2FA NO debe quedar habilitado
        var reloaded = await ReloadUserAsync(user.Id);
        reloaded.TotpEnabled.Should().BeFalse();
    }

    // -----------------------------------------------------------------------
    // (d) Verify2FAAsync — OTP valido completa autenticacion
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Verify2FAAsync_DeberiaCompletarLogin_CuandoOtpEsValido()
    {
        // Arrange — usuario con 2FA habilitado
        var user = await CreateFreshUserAsync();
        string base32Secret = await SetupAndEnable2FAAsync(user.Id);

        var validOtp = ComputeCurrentOtp(base32Secret);

        // Act
        object? result;
        using var scope = _factory.Services.CreateScope();
        var authSvc = ResolveAuthService(scope);
        result = await authSvc.Verify2FAAsync(user.Id, validOtp);

        // Assert — debe retornar token de acceso (login completado)
        result.Should().NotBeNull();
        var json = JsonSerializer.Serialize(result);
        json.Should().Contain("token", "login 2FA exitoso debe emitir token");
        json.Should().Contain("refreshToken");
    }

    // -----------------------------------------------------------------------
    // (e) Verify2FAAsync — OTP invalido retorna null
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Verify2FAAsync_DeberiaRetornarNull_CuandoOtpEsInvalido()
    {
        // Arrange
        var user = await CreateFreshUserAsync();
        await SetupAndEnable2FAAsync(user.Id);

        // Act
        object? result;
        using var scope = _factory.Services.CreateScope();
        var authSvc = ResolveAuthService(scope);
        result = await authSvc.Verify2FAAsync(user.Id, "000000");

        // Assert
        result.Should().BeNull("OTP invalido debe retornar null (-> 401 en el endpoint)");
    }

    // -----------------------------------------------------------------------
    // (f) Lockout tras MaxTotpAttempts (5) intentos fallidos en Verify2FAAsync
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Verify2FAAsync_DeberiaRetornarTotp_Locked_DespuesDe5IntentosInvalidos()
    {
        // Arrange — usuario con 2FA habilitado
        var user = await CreateFreshUserAsync();
        await SetupAndEnable2FAAsync(user.Id);

        // NOTA: _totpAttempts es estatico en AuthService. El test usa un userId unico
        // (asignado por la DB a este usuario fresco), por lo que no hay contaminacion
        // cruzada con otros tests que creen sus propios usuarios frescos.
        // El refactor a IMemoryCache es un follow-up (PLAN-015).

        // Act — 5 intentos invalidos para alcanzar el umbral
        object? resultAfterLockout = null;
        for (var i = 0; i < 5; i++)
        {
            using var scope = _factory.Services.CreateScope();
            var authSvc = ResolveAuthService(scope);
            resultAfterLockout = await authSvc.Verify2FAAsync(user.Id, "111111");
        }

        // El 5to intento en el umbral retorna null (incrementa el contador al limite).
        // El 6to intento ya debe retornar TOTP_LOCKED.
        object? lockedResult;
        using (var scope = _factory.Services.CreateScope())
        {
            var authSvc = ResolveAuthService(scope);
            lockedResult = await authSvc.Verify2FAAsync(user.Id, "222222");
        }

        // Assert — el 6to intento (usuario ya en lockout) debe retornar el objeto TOTP_LOCKED
        lockedResult.Should().NotBeNull("en lockout no retorna null, retorna el objeto TOTP_LOCKED");
        var json = JsonSerializer.Serialize(lockedResult);
        json.Should().Contain("TOTP_LOCKED", "despues de 5 fallos el usuario queda bloqueado");
        json.Should().NotContain("\"token\"", "en lockout no se emite token");
    }

    // -----------------------------------------------------------------------
    // (g) Recovery code valido completa autenticacion
    // -----------------------------------------------------------------------

    [Fact]
    public async Task Verify2FAAsync_DeberiaCompletarLogin_ConRecoveryCodeValido()
    {
        // Arrange — usuario con 2FA habilitado, guardar un recovery code
        var user = await CreateFreshUserAsync();
        List<string> recoveryCodes = await SetupAndEnable2FAAsync_WithCodes(user.Id);
        var plainRecoveryCode = recoveryCodes[0];

        // Act
        object? result;
        using var scope = _factory.Services.CreateScope();
        var authSvc = ResolveAuthService(scope);
        result = await authSvc.Verify2FAAsync(user.Id, plainRecoveryCode);

        // Assert — debe completar login
        result.Should().NotBeNull();
        var json = JsonSerializer.Serialize(result);
        json.Should().Contain("token");
        // La respuesta debe indicar que se uso un recovery code
        json.Should().Contain("recoveryCodeUsed");

        // El recovery code debe estar marcado como usado en la DB
        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
        var used = await db2.Set<TwoFactorRecoveryCode>()
            .Where(rc => rc.UsuarioId == user.Id && rc.UsedAt != null)
            .CountAsync();
        used.Should().Be(1, "exactamente un recovery code fue consumido");
    }

    // -----------------------------------------------------------------------
    // (h) DisableAsync con OTP valido
    // -----------------------------------------------------------------------

    [Fact]
    public async Task DisableAsync_DeberiaDesactivar2FA_CuandoOtpEsValido()
    {
        // Arrange
        var user = await CreateFreshUserAsync();
        var base32Secret = await SetupAndEnable2FAAsync(user.Id);
        var validOtp = ComputeCurrentOtp(base32Secret);

        // Act
        bool success;
        using var scope = _factory.Services.CreateScope();
        var totpSvc = ResolveTotpService(scope);
        success = await totpSvc.DisableAsync(user.Id, validOtp);

        // Assert
        success.Should().BeTrue();
        var reloaded = await ReloadUserAsync(user.Id);
        reloaded.TotpEnabled.Should().BeFalse();
        reloaded.TotpSecretEncrypted.Should().BeNullOrEmpty("el secreto debe borrarse al deshabilitar");

        // Recovery codes deben haber sido eliminados
        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
        var remaining = await db2.Set<TwoFactorRecoveryCode>()
            .Where(rc => rc.UsuarioId == user.Id)
            .CountAsync();
        remaining.Should().Be(0);
    }

    [Fact]
    public async Task DisableAsync_DeberiaRetornarFalse_CuandoOtpEsInvalido()
    {
        // Arrange
        var user = await CreateFreshUserAsync();
        await SetupAndEnable2FAAsync(user.Id);

        // Act
        bool success;
        using var scope = _factory.Services.CreateScope();
        var totpSvc = ResolveTotpService(scope);
        success = await totpSvc.DisableAsync(user.Id, "000000");

        // Assert — 2FA NO debe desactivarse
        success.Should().BeFalse();
        var reloaded = await ReloadUserAsync(user.Id);
        reloaded.TotpEnabled.Should().BeTrue("OTP invalido no debe deshabilitar 2FA");
    }

    // -----------------------------------------------------------------------
    // (i) GetStatusAsync — refleja estado correcto
    // -----------------------------------------------------------------------

    [Fact]
    public async Task GetStatusAsync_DeberiaIndicarDeshabilitado_ParaUsuarioSin2FA()
    {
        // Arrange
        var user = await CreateFreshUserAsync();

        // Act
        TotpStatusResult status;
        using var scope = _factory.Services.CreateScope();
        var totpSvc = ResolveTotpService(scope);
        status = await totpSvc.GetStatusAsync(user.Id);

        // Assert
        status.Enabled.Should().BeFalse();
        status.EnabledAt.Should().BeNull();
        status.RemainingRecoveryCodes.Should().Be(0);
    }

    [Fact]
    public async Task GetStatusAsync_DeberiaIndicarHabilitado_TrasActivar2FA()
    {
        // Arrange
        var user = await CreateFreshUserAsync();
        await SetupAndEnable2FAAsync(user.Id);

        // Act
        TotpStatusResult status;
        using var scope = _factory.Services.CreateScope();
        var totpSvc = ResolveTotpService(scope);
        status = await totpSvc.GetStatusAsync(user.Id);

        // Assert
        status.Enabled.Should().BeTrue();
        status.EnabledAt.Should().NotBeNull();
        status.RemainingRecoveryCodes.Should().Be(10);
    }

    // -----------------------------------------------------------------------
    // Helpers para setup completo (setup + enable)
    // -----------------------------------------------------------------------

    /// <summary>
    /// Ejecuta setup + enable con OTP valido. Retorna el secreto Base32 para que el test
    /// pueda generar OTPs adicionales.
    /// </summary>
    private async Task<string> SetupAndEnable2FAAsync(int userId)
    {
        string base32Secret;

        using (var scope = _factory.Services.CreateScope())
        {
            var totpSvc = ResolveTotpService(scope);
            var setup = await totpSvc.GenerateSetupAsync(userId);
            base32Secret = ExtractSecretFromUri(setup.OtpauthUri);
        }

        var validOtp = ComputeCurrentOtp(base32Secret);

        using (var scope = _factory.Services.CreateScope())
        {
            var totpSvc = ResolveTotpService(scope);
            await totpSvc.EnableAsync(userId, validOtp);
        }

        return base32Secret;
    }

    /// <summary>
    /// Igual que SetupAndEnable2FAAsync pero retorna la lista de recovery codes generados.
    /// </summary>
    private async Task<List<string>> SetupAndEnable2FAAsync_WithCodes(int userId)
    {
        string base32Secret;

        using (var scope = _factory.Services.CreateScope())
        {
            var totpSvc = ResolveTotpService(scope);
            var setup = await totpSvc.GenerateSetupAsync(userId);
            base32Secret = ExtractSecretFromUri(setup.OtpauthUri);
        }

        var validOtp = ComputeCurrentOtp(base32Secret);

        TotpEnableResult enableResult;
        using (var scope = _factory.Services.CreateScope())
        {
            var totpSvc = ResolveTotpService(scope);
            enableResult = await totpSvc.EnableAsync(userId, validOtp);
        }

        return enableResult.RecoveryCodes;
    }
}
