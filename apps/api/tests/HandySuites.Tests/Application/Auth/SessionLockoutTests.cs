using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HandySuites.Tests.Application.Auth
{
    /// <summary>
    /// Cobertura del modelo de SESSION LOCKOUT del API main.
    ///
    /// El sistema combina DOS mecanismos de bloqueo en el endpoint /auth/login:
    ///
    ///   1. Account-level lockout (Sprint correctivo 2026-06-06): tras
    ///      MaxFailedAttempts (5) fallos consecutivos de password, se setea
    ///      Usuario.LockedUntil = UtcNow + 15min. Mientras LockedUntil > UtcNow,
    ///      cualquier intento de login (incluso con password correcta) retorna
    ///      ACCOUNT_LOCKED (200 OK del endpoint con cuerpo { code = "ACCOUNT_LOCKED" }).
    ///
    ///   2. Single-session enforcement: si el usuario ya tiene una DeviceSession
    ///      activa y NO es SuperAdmin, login retorna ACTIVE_SESSION_EXISTS
    ///      (HTTP 409 Conflict desde el endpoint). El SuperAdmin esta exento.
    ///      El usuario debe llamar /auth/force-login (sin 2FA) o /auth/verify-2fa
    ///      (con 2FA) para tomar la sesion.
    ///
    /// Esta suite valida:
    ///   - Happy path: login limpio resetea contadores tras un fallo previo.
    ///   - Lockout despues de 5 fallos.
    ///   - El lockout persiste aunque la password sea correcta.
    ///   - Single-session: ACTIVE_SESSION_EXISTS para no-SuperAdmin con sesion previa.
    ///   - RBAC: SuperAdmin exento de single-session.
    ///   - IDOR cross-tenant: el lockout es per-usuario, no contamina otros tenants.
    ///
    /// Reusa CustomWebApplicationFactory (SQLite in-memory + seed) — mismo patron
    /// que AuthServiceTests.cs y AuthEndpointsTests.cs existentes.
    /// </summary>
    public class SessionLockoutTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public SessionLockoutTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        // ------------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------------

        private async Task<(Usuario user, string email, string password)> CreateFreshTenantUserAsync(
            int tenantId = 1, string? rol = "VENDEDOR")
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();

            var email = $"lockout-{Guid.NewGuid():N}@test.com";
            var password = "Test123!";
            var user = new Usuario
            {
                Email = email,
                Nombre = "Lockout User",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Activo = true,
                CreadoEn = DateTime.UtcNow,
                TenantId = tenantId,
                RolExplicito = rol,
                EmailVerificado = true,
                FailedLoginAttempts = 0,
                LockedUntil = null
            };
            db.Usuarios.Add(user);
            await db.SaveChangesAsync();
            return (user, email, password);
        }

        private async Task<Usuario> ReloadAsync(int userId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            return await db.Usuarios.IgnoreQueryFilters().FirstAsync(u => u.Id == userId);
        }

        private async Task<AuthService> ResolveAuthServiceAsync()
        {
            // Use a *fresh* scope per call to mirror request scoping for AuthService.
            // The caller is responsible for not crossing scopes with returned objects.
            await Task.CompletedTask;
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AuthService>();
        }

        // ------------------------------------------------------------------
        // Account-level lockout (failed-password counter)
        // ------------------------------------------------------------------

        [Fact]
        public async Task FailedLogin_DeberiaIncrementarContador_PeroNoBloquearAntesDeUmbral()
        {
            // Arrange
            var (user, email, _) = await CreateFreshTenantUserAsync();

            // Act — 3 intentos fallidos (umbral = 5)
            for (var i = 0; i < 3; i++)
            {
                var result = await (await ResolveAuthServiceAsync()).LoginAsync(new UsuarioLoginDto
                {
                    email = email,
                    password = "WrongPassword!"
                });
                result.Should().BeNull("3 fallidos NO debe lockear todavia");
            }

            // Assert
            var refreshed = await ReloadAsync(user.Id);
            refreshed.FailedLoginAttempts.Should().Be(3);
            refreshed.LockedUntil.Should().BeNull();
        }

        [Fact]
        public async Task FailedLogin_DeberiaBloquearCuenta_DespuesDe5Fallos()
        {
            // Arrange
            var (user, email, _) = await CreateFreshTenantUserAsync();

            // Act — 5 intentos fallidos
            for (var i = 0; i < 5; i++)
            {
                var auth = await ResolveAuthServiceAsync();
                await auth.LoginAsync(new UsuarioLoginDto
                {
                    email = email,
                    password = "WrongPassword!"
                });
            }

            // Assert
            var refreshed = await ReloadAsync(user.Id);
            refreshed.FailedLoginAttempts.Should().BeGreaterThanOrEqualTo(5);
            refreshed.LockedUntil.Should().NotBeNull();
            refreshed.LockedUntil!.Value.Should().BeAfter(DateTime.UtcNow.AddMinutes(10));
            refreshed.LockedUntil.Value.Should().BeBefore(DateTime.UtcNow.AddMinutes(20));
        }

        [Fact]
        public async Task Login_DeberiaRechazarConPasswordCorrecto_CuandoCuentaEstaBloqueada()
        {
            // Arrange — bloqueamos directamente la cuenta para simular post-umbral
            var (user, email, password) = await CreateFreshTenantUserAsync();
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                var u = await db.Usuarios.IgnoreQueryFilters().FirstAsync(x => x.Id == user.Id);
                u.FailedLoginAttempts = 5;
                u.LockedUntil = DateTime.UtcNow.AddMinutes(15);
                await db.SaveChangesAsync();
            }

            // Act — password correcta pero cuenta bloqueada
            var auth = await ResolveAuthServiceAsync();
            var result = await auth.LoginAsync(new UsuarioLoginDto
            {
                email = email,
                password = password
            });

            // Assert — debe retornar el objeto ACCOUNT_LOCKED (no null, no token)
            result.Should().NotBeNull();
            var json = JsonSerializer.Serialize(result);
            json.Should().Contain("ACCOUNT_LOCKED");
            json.Should().NotContain("\"token\"");
        }

        [Fact]
        public async Task Login_DeberiaResetearContador_TrasLoginExitoso()
        {
            // Arrange — 2 fallos previos, password correcta despues
            var (user, email, password) = await CreateFreshTenantUserAsync();
            for (var i = 0; i < 2; i++)
            {
                var auth = await ResolveAuthServiceAsync();
                await auth.LoginAsync(new UsuarioLoginDto { email = email, password = "WrongPassword!" });
            }
            (await ReloadAsync(user.Id)).FailedLoginAttempts.Should().Be(2);

            // Act
            var loginOk = await (await ResolveAuthServiceAsync()).LoginAsync(new UsuarioLoginDto
            {
                email = email,
                password = password
            });

            // Assert — el objeto retornado tiene token (login exitoso) y los contadores estan reseteados
            loginOk.Should().NotBeNull();
            var refreshed = await ReloadAsync(user.Id);
            refreshed.FailedLoginAttempts.Should().Be(0);
            refreshed.LockedUntil.Should().BeNull();
        }

        [Fact]
        public async Task Login_DeberiaIgnorarLockoutExpirado()
        {
            // Arrange — usuario con LockedUntil en el pasado (ya expiro)
            var (user, email, password) = await CreateFreshTenantUserAsync();
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                var u = await db.Usuarios.IgnoreQueryFilters().FirstAsync(x => x.Id == user.Id);
                u.FailedLoginAttempts = 5;
                u.LockedUntil = DateTime.UtcNow.AddMinutes(-1); // expirado hace 1 minuto
                await db.SaveChangesAsync();
            }

            // Act — password correcta tras la expiracion del lockout
            var result = await (await ResolveAuthServiceAsync()).LoginAsync(new UsuarioLoginDto
            {
                email = email,
                password = password
            });

            // Assert — login debe proceder normalmente (single-session lo puede convertir
            // en ACTIVE_SESSION_EXISTS si hay sesion previa; aqui no la hay).
            // Lo CRITICO es que NO retorne ACCOUNT_LOCKED.
            result.Should().NotBeNull();
            JsonSerializer.Serialize(result).Should().NotContain("ACCOUNT_LOCKED");
        }

        // ------------------------------------------------------------------
        // IDOR / cross-tenant: el lockout es per-usuario
        // ------------------------------------------------------------------

        [Fact]
        public async Task Lockout_NoDeberiaContaminarOtroUsuario_NiOtroTenant()
        {
            // Arrange — dos usuarios en tenants distintos
            var (victim, victimEmail, _) = await CreateFreshTenantUserAsync(tenantId: 1);
            var (other, otherEmail, otherPassword) = await CreateFreshTenantUserAsync(tenantId: 2);

            // Act — bloqueamos a la victima con 5 fallos
            for (var i = 0; i < 5; i++)
            {
                var auth = await ResolveAuthServiceAsync();
                await auth.LoginAsync(new UsuarioLoginDto
                {
                    email = victimEmail,
                    password = "WrongPassword!"
                });
            }

            // Assert — victima bloqueada
            var victimReloaded = await ReloadAsync(victim.Id);
            victimReloaded.LockedUntil.Should().NotBeNull();

            // El otro usuario en el OTRO tenant NO debe estar afectado
            var otherReloaded = await ReloadAsync(other.Id);
            otherReloaded.FailedLoginAttempts.Should().Be(0);
            otherReloaded.LockedUntil.Should().BeNull();

            // Y debe poder loguearse normalmente
            var otherLogin = await (await ResolveAuthServiceAsync()).LoginAsync(new UsuarioLoginDto
            {
                email = otherEmail,
                password = otherPassword
            });
            otherLogin.Should().NotBeNull();
            JsonSerializer.Serialize(otherLogin).Should().NotContain("ACCOUNT_LOCKED");
        }

        [Fact]
        public async Task FailedLogin_NoDeberiaCrearUsuario_NiLockear_CuandoEmailNoExiste()
        {
            // Arrange — email completamente inexistente
            var ghostEmail = $"ghost-{Guid.NewGuid():N}@nowhere.com";

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var beforeCount = await db.Usuarios.IgnoreQueryFilters().CountAsync();

            // Act — 6 intentos fallidos contra email inexistente
            for (var i = 0; i < 6; i++)
            {
                var auth = await ResolveAuthServiceAsync();
                var result = await auth.LoginAsync(new UsuarioLoginDto
                {
                    email = ghostEmail,
                    password = "WrongPassword!"
                });
                result.Should().BeNull();
            }

            // Assert — no se crea ningun usuario; el contador global no debe explotar
            var afterCount = await db.Usuarios.IgnoreQueryFilters().CountAsync();
            afterCount.Should().Be(beforeCount, "no debe materializarse un usuario por email inexistente");
        }

        // ------------------------------------------------------------------
        // Single-session enforcement: ACTIVE_SESSION_EXISTS
        // ------------------------------------------------------------------

        [Fact]
        public async Task Login_DeberiaRetornarActiveSessionExists_CuandoYaHaySesionActiva_NoSuperAdmin()
        {
            // Arrange — usuario regular (no SuperAdmin) con DeviceSession activa
            var (user, email, password) = await CreateFreshTenantUserAsync(rol: "ADMIN");

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                db.DeviceSessions.Add(new DeviceSession
                {
                    UsuarioId = user.Id,
                    TenantId = user.TenantId,
                    DeviceId = "device-A",
                    DeviceName = "Chrome Windows",
                    UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
                    IpAddress = "10.0.0.10",
                    Status = SessionStatus.Active,
                    LoggedInAt = DateTime.UtcNow.AddMinutes(-5),
                    LastActivity = DateTime.UtcNow.AddMinutes(-1)
                });
                await db.SaveChangesAsync();
            }

            // Act — segundo login desde otro device
            var result = await (await ResolveAuthServiceAsync()).LoginAsync(new UsuarioLoginDto
            {
                email = email,
                password = password
            });

            // Assert
            result.Should().NotBeNull();
            var json = JsonSerializer.Serialize(result);
            json.Should().Contain("ACTIVE_SESSION_EXISTS");
            json.Should().NotContain("\"token\"", "el servicio NO debe emitir token mientras haya sesion activa");
        }

        [Fact]
        public async Task Login_DeberiaIgnorarSingleSession_CuandoUsuarioEsSuperAdmin()
        {
            // Arrange — SUPER_ADMIN con sesion activa previa
            var (user, email, password) = await CreateFreshTenantUserAsync(rol: "SUPER_ADMIN");

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                db.DeviceSessions.Add(new DeviceSession
                {
                    UsuarioId = user.Id,
                    TenantId = user.TenantId,
                    DeviceId = "device-SA",
                    DeviceName = "Firefox MacOS",
                    UserAgent = "Mozilla/5.0 (Macintosh) Firefox/120",
                    IpAddress = "10.0.0.20",
                    Status = SessionStatus.Active,
                    LoggedInAt = DateTime.UtcNow.AddMinutes(-5),
                    LastActivity = DateTime.UtcNow.AddMinutes(-1)
                });
                await db.SaveChangesAsync();
            }

            // Act
            var result = await (await ResolveAuthServiceAsync()).LoginAsync(new UsuarioLoginDto
            {
                email = email,
                password = password
            });

            // Assert — SuperAdmin debe completar login normalmente (emite token)
            result.Should().NotBeNull();
            var json = JsonSerializer.Serialize(result);
            json.Should().NotContain("ACTIVE_SESSION_EXISTS");
            // CompleteLogin emite { user, token, refreshToken }
            json.Should().Contain("token");
        }

        // ------------------------------------------------------------------
        // ForceLogin: takeover flow
        // ------------------------------------------------------------------

        [Fact]
        public async Task ForceLogin_DeberiaCerrarSesionesActivas_YCompletarLogin()
        {
            // Arrange
            var (user, email, password) = await CreateFreshTenantUserAsync(rol: "ADMIN");
            int seededSessionId;
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                var session = new DeviceSession
                {
                    UsuarioId = user.Id,
                    TenantId = user.TenantId,
                    DeviceId = "device-old",
                    DeviceName = "Old laptop",
                    UserAgent = "Mozilla/5.0",
                    IpAddress = "10.0.0.30",
                    Status = SessionStatus.Active,
                    LoggedInAt = DateTime.UtcNow.AddMinutes(-30),
                    LastActivity = DateTime.UtcNow.AddMinutes(-2)
                };
                db.DeviceSessions.Add(session);
                await db.SaveChangesAsync();
                seededSessionId = session.Id;
            }

            // Act — force login (takeover)
            var result = await (await ResolveAuthServiceAsync()).ForceLoginAsync(new UsuarioLoginDto
            {
                email = email,
                password = password
            });

            // Assert — debe completar el login (objeto con token)
            result.Should().NotBeNull();
            JsonSerializer.Serialize(result).Should().Contain("token");

            // La sesion previa debe estar cerrada (no Active)
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                var oldSession = await db.DeviceSessions.IgnoreQueryFilters()
                    .FirstAsync(s => s.Id == seededSessionId);
                oldSession.Status.Should().NotBe(SessionStatus.Active,
                    "ForceLogin debe cerrar la sesion previa via CloseAllActiveSessions");
            }
        }

        [Fact]
        public async Task ForceLogin_DeberiaRetornarNull_CuandoPasswordIncorrecta()
        {
            // Arrange
            var (_, email, _) = await CreateFreshTenantUserAsync();

            // Act
            var result = await (await ResolveAuthServiceAsync()).ForceLoginAsync(new UsuarioLoginDto
            {
                email = email,
                password = "TotallyWrong!"
            });

            // Assert — null traduce a 401 desde el endpoint
            result.Should().BeNull();
        }

        // ------------------------------------------------------------------
        // Endpoint-level: el contrato HTTP
        // ------------------------------------------------------------------

        [Fact]
        public async Task LoginEndpoint_DeberiaRetornar409Conflict_CuandoSesionPreviaActiva()
        {
            // Arrange — seed user con EmailVerificado y una DeviceSession activa
            var email = $"endpoint-{Guid.NewGuid():N}@test.com";
            var password = "Test123!";
            int userId;
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                var u = new Usuario
                {
                    Email = email,
                    Nombre = "Endpoint Conflict",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Activo = true,
                    CreadoEn = DateTime.UtcNow,
                    TenantId = 1,
                    RolExplicito = "ADMIN",
                    EmailVerificado = true
                };
                db.Usuarios.Add(u);
                await db.SaveChangesAsync();
                userId = u.Id;

                db.DeviceSessions.Add(new DeviceSession
                {
                    UsuarioId = userId,
                    TenantId = 1,
                    DeviceId = "device-existing",
                    DeviceName = "Existing browser",
                    UserAgent = "Mozilla/5.0",
                    IpAddress = "10.0.0.40",
                    Status = SessionStatus.Active,
                    LoggedInAt = DateTime.UtcNow.AddMinutes(-10),
                    LastActivity = DateTime.UtcNow.AddMinutes(-1)
                });
                await db.SaveChangesAsync();
            }

            // Act — POST /auth/login
            var response = await _client.PostAsJsonAsync("/auth/login", new UsuarioLoginDto
            {
                email = email,
                password = password
            });

            // Assert — endpoint debe traducir ACTIVE_SESSION_EXISTS a 409
            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            body.TryGetProperty("code", out var codeProp).Should().BeTrue();
            codeProp.GetString().Should().Be("ACTIVE_SESSION_EXISTS");
        }

        [Fact]
        public async Task LoginEndpoint_DeberiaRetornar200_ConCodeAccountLocked_CuandoCuentaBloqueada()
        {
            // Arrange
            var email = $"locked-{Guid.NewGuid():N}@test.com";
            var password = "Test123!";
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
                db.Usuarios.Add(new Usuario
                {
                    Email = email,
                    Nombre = "Already Locked",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Activo = true,
                    CreadoEn = DateTime.UtcNow,
                    TenantId = 1,
                    RolExplicito = "VENDEDOR",
                    EmailVerificado = true,
                    FailedLoginAttempts = 5,
                    LockedUntil = DateTime.UtcNow.AddMinutes(15)
                });
                await db.SaveChangesAsync();
            }

            // Act
            var response = await _client.PostAsJsonAsync("/auth/login", new UsuarioLoginDto
            {
                email = email,
                password = password
            });

            // Assert
            //
            // PROD BUG / FIX TODO: el endpoint /auth/login retorna `Results.Ok(result)`
            // cuando AuthService responde { code = "ACCOUNT_LOCKED" } porque el branch
            // solo inspecciona "ACTIVE_SESSION_EXISTS". Idealmente deberia ser un 423
            // Locked o 429 Too Many Requests (analogo al TOTP_LOCKED en /auth/verify-2fa
            // que SI retorna 429). Por ahora validamos el contrato actual: HTTP 200 con
            // code=ACCOUNT_LOCKED — el frontend distingue por el campo `code`.
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            body.TryGetProperty("code", out var codeProp).Should().BeTrue();
            codeProp.GetString().Should().Be("ACCOUNT_LOCKED");
            body.TryGetProperty("token", out _).Should().BeFalse("no debe emitir token mientras este bloqueado");
        }
    }
}
