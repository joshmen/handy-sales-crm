using FluentAssertions;
using HandySuites.Application.GlobalSettings.DTOs;
using HandySuites.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HandySuites.Tests.Application.SuperAdmin
{
    /// <summary>
    /// Tests funcionales para /api/global-settings (GET / PUT / DELETE delete-logo).
    /// Cubre:
    ///   * Happy path SUPER_ADMIN — GET full payload y PUT actualizando campos.
    ///   * Read public para roles autenticados no SUPER_ADMIN (proyeccion reducida).
    ///   * RBAC negativo — ADMIN/SUPERVISOR/VENDEDOR no pueden PUT/DELETE.
    ///   * Auth negativo — sin token devuelve 401.
    ///   * Cross-tenant IDOR — GlobalSettings es global (un solo registro), por lo que
    ///     un usuario de tenant=2 NO debe poder mutar el registro global (PUT solo SA).
    /// Endpoint: apps/api/src/HandySuites.Api/Endpoints/GlobalSettingsEndpoints.cs
    /// Service:  libs/HandySuites.Application/GlobalSettings/Services/GlobalSettingsService.cs
    /// </summary>
    public class GlobalSettingsFunctionalTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _adminClient;       // default = role ADMIN tenant 1
        private readonly HttpClient _superAdminClient;  // SUPER_ADMIN
        private readonly HttpClient _supervisorClient;  // SUPERVISOR
        private readonly HttpClient _vendedorClient;    // VENDEDOR
        private readonly HttpClient _anonClient;        // sin auth

        public GlobalSettingsFunctionalTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;

            _adminClient = factory.CreateClient();
            _adminClient.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");
            _adminClient.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            _adminClient.DefaultRequestHeaders.Add("X-Test-TenantId", "1");

            _superAdminClient = factory.CreateClient();
            _superAdminClient.DefaultRequestHeaders.Add("X-Test-Role", "SUPER_ADMIN");
            _superAdminClient.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            _superAdminClient.DefaultRequestHeaders.Add("X-Test-TenantId", "1");
            // Belt and suspenders — algunos endpoints leen X-Test-SuperAdmin
            _superAdminClient.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            _supervisorClient = factory.CreateClient();
            _supervisorClient.DefaultRequestHeaders.Add("X-Test-Role", "SUPERVISOR");
            _supervisorClient.DefaultRequestHeaders.Add("X-Test-UserId", "200");
            _supervisorClient.DefaultRequestHeaders.Add("X-Test-TenantId", "1");

            _vendedorClient = factory.CreateClient();
            _vendedorClient.DefaultRequestHeaders.Add("X-Test-Role", "VENDEDOR");
            _vendedorClient.DefaultRequestHeaders.Add("X-Test-UserId", "123");
            _vendedorClient.DefaultRequestHeaders.Add("X-Test-TenantId", "1");

            _anonClient = factory.CreateClient();
            _anonClient.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
        }

        // ════════════════════════════════════════════════════════════════════
        // GET /api/global-settings — Happy path SUPER_ADMIN (payload completo)
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetGlobalSettings_SuperAdmin_DevuelvePayloadCompletoConCamposAdministrativos()
        {
            var response = await _superAdminClient.GetAsync("/api/global-settings/");
            response.StatusCode.Should().Be(HttpStatusCode.OK, "el seeder crea GlobalSettings Id=1");

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();

            // Campos publicos siempre presentes
            json.TryGetProperty("platformName", out var nameProp).Should().BeTrue();
            nameProp.GetString().Should().NotBeNullOrEmpty();
            json.TryGetProperty("maintenanceMode", out _).Should().BeTrue();
            json.TryGetProperty("defaultLanguage", out _).Should().BeTrue();

            // Campos administrativos solo visibles para SUPER_ADMIN
            json.TryGetProperty("allowSelfRegistration", out _).Should().BeTrue("SUPER_ADMIN debe ver flags de seguridad");
            json.TryGetProperty("requireEmailVerification", out _).Should().BeTrue();
        }

        // ════════════════════════════════════════════════════════════════════
        // GET /api/global-settings — Proyeccion publica para no SA autenticado
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetGlobalSettings_AdminAutenticado_DevuelveSoloProyeccionPublica()
        {
            var response = await _adminClient.GetAsync("/api/global-settings/");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();

            // La proyeccion publica NO incluye flags administrativos
            json.TryGetProperty("allowSelfRegistration", out _).Should().BeFalse(
                "ADMIN no debe ver flags administrativos sensibles");
            json.TryGetProperty("requireEmailVerification", out _).Should().BeFalse();
            json.TryGetProperty("maxUsersPerCompany", out _).Should().BeFalse();

            // Pero si los publicos
            json.TryGetProperty("platformName", out _).Should().BeTrue();
            json.TryGetProperty("platformPrimaryColor", out _).Should().BeTrue();
            json.TryGetProperty("maintenanceMode", out _).Should().BeTrue();
        }

        [Theory]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task GetGlobalSettings_RolesNoSA_DevuelveOkConProyeccionPublica(string role)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Test-Role", role);
            client.DefaultRequestHeaders.Add("X-Test-UserId", "123");
            client.DefaultRequestHeaders.Add("X-Test-TenantId", "1");

            var response = await client.GetAsync("/api/global-settings/");
            response.StatusCode.Should().Be(HttpStatusCode.OK, $"GET es lectura para autenticados rol={role}");

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            json.TryGetProperty("allowSelfRegistration", out _).Should().BeFalse(
                $"rol {role} no debe ver flags administrativos");
        }

        // ════════════════════════════════════════════════════════════════════
        // GET sin autenticar — 401
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task GetGlobalSettings_SinAuth_DevuelveUnauthorized()
        {
            var response = await _anonClient.GetAsync("/api/global-settings/");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden,
                "RequireAuthorization() debe rechazar request anonimo");
        }

        // ════════════════════════════════════════════════════════════════════
        // PUT /api/global-settings — Happy path SUPER_ADMIN
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task UpdateGlobalSettings_SuperAdmin_ActualizaCamposYpersisteEnDb()
        {
            var nuevoNombre = $"Platform Renamed {Guid.NewGuid():N}";
            var request = new UpdateGlobalSettingsDto
            {
                PlatformName = nuevoNombre,
                PlatformPrimaryColor = "#FF0000",
                DefaultLanguage = "en",
                AllowSelfRegistration = true,
                MaintenanceMessage = "Mantenimiento programado"
            };

            var response = await _superAdminClient.PutAsJsonAsync("/api/global-settings/", request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var dto = await response.Content.ReadFromJsonAsync<GlobalSettingsDto>();
            dto.Should().NotBeNull();
            dto!.PlatformName.Should().Be(nuevoNombre);
            dto.PlatformPrimaryColor.Should().Be("#FF0000");
            dto.DefaultLanguage.Should().Be("en");
            dto.AllowSelfRegistration.Should().BeTrue();
            dto.MaintenanceMessage.Should().Be("Mantenimiento programado");

            // Verificar persistencia en DB
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var persisted = db.GlobalSettings.FirstOrDefault();
            persisted.Should().NotBeNull();
            persisted!.PlatformName.Should().Be(nuevoNombre);
            persisted.PlatformPrimaryColor.Should().Be("#FF0000");
            persisted.AllowSelfRegistration.Should().BeTrue();
        }

        [Fact]
        public async Task UpdateGlobalSettings_SuperAdmin_CamposNoEnviadosSeMantienen()
        {
            // Snapshot inicial
            var initialResponse = await _superAdminClient.GetAsync("/api/global-settings/");
            var initial = await initialResponse.Content.ReadFromJsonAsync<GlobalSettingsDto>();
            initial.Should().NotBeNull();
            var originalLang = initial!.DefaultLanguage;

            // Solo cambiar PlatformSecondaryColor
            var request = new UpdateGlobalSettingsDto { PlatformSecondaryColor = "#00FF00" };
            var response = await _superAdminClient.PutAsJsonAsync("/api/global-settings/", request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var updated = await response.Content.ReadFromJsonAsync<GlobalSettingsDto>();
            updated!.PlatformSecondaryColor.Should().Be("#00FF00");
            updated.DefaultLanguage.Should().Be(originalLang,
                "PATCH semantics — campos no enviados no se tocan");
        }

        // ════════════════════════════════════════════════════════════════════
        // PUT — RBAC negativo
        // ════════════════════════════════════════════════════════════════════

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task UpdateGlobalSettings_RolesNoSuperAdmin_Devuelve403(string role)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Test-Role", role);
            client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            client.DefaultRequestHeaders.Add("X-Test-TenantId", "1");

            var request = new UpdateGlobalSettingsDto { PlatformName = $"Hijacked by {role}" };
            var response = await client.PutAsJsonAsync("/api/global-settings/", request);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"rol {role} no debe poder mutar GlobalSettings");
        }

        [Fact]
        public async Task UpdateGlobalSettings_SinAuth_NoEsOk()
        {
            var request = new UpdateGlobalSettingsDto { PlatformName = "Anon hijack" };
            var response = await _anonClient.PutAsJsonAsync("/api/global-settings/", request);

            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "sin auth jamas debe devolver 200");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
        }

        // ════════════════════════════════════════════════════════════════════
        // IDOR cross-tenant — GlobalSettings es global (un solo registro).
        // Aun cuando el usuario sea ADMIN de tenant 2, NO debe poder modificarlo.
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        public async Task UpdateGlobalSettings_AdminDeTenantSecundario_NoPuedeMutar()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");
            client.DefaultRequestHeaders.Add("X-Test-UserId", "125");
            client.DefaultRequestHeaders.Add("X-Test-TenantId", "2");

            var request = new UpdateGlobalSettingsDto { PlatformName = "Cross-tenant hijack" };
            var response = await client.PutAsJsonAsync("/api/global-settings/", request);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "GlobalSettings es global y solo SA puede mutarlo, sin importar tenant");

            // Confirmar que no se persistio
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
            var persisted = db.GlobalSettings.FirstOrDefault();
            persisted!.PlatformName.Should().NotBe("Cross-tenant hijack");
        }

        // ════════════════════════════════════════════════════════════════════
        // DELETE /api/global-settings/delete-logo — RBAC
        // ════════════════════════════════════════════════════════════════════

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task DeleteLogo_RolesNoSuperAdmin_Devuelve403(string role)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Test-Role", role);
            client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            client.DefaultRequestHeaders.Add("X-Test-TenantId", "1");

            var response = await client.DeleteAsync("/api/global-settings/delete-logo");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"rol {role} no debe poder borrar el logo de plataforma");
        }

        [Fact]
        public async Task DeleteLogo_SuperAdmin_DevuelveOkOk()
        {
            // El seeder no provee logo — endpoint debe responder 200 (limpia campos null igualmente)
            var response = await _superAdminClient.DeleteAsync("/api/global-settings/delete-logo");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound,
                "SA debe poder ejecutar delete-logo (200 OK o 404 si no hay logo)");
        }

        // ════════════════════════════════════════════════════════════════════
        // POST /upload-logo — RBAC negativo (sin multipart real, solo policy)
        // ════════════════════════════════════════════════════════════════════

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task UploadLogo_RolesNoSuperAdmin_NoOk(string role)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Test-Role", role);
            client.DefaultRequestHeaders.Add("X-Test-UserId", "1");
            client.DefaultRequestHeaders.Add("X-Test-TenantId", "1");

            // Multipart minimo — el endpoint debe bloquear ANTES del IFormFile binding por RBAC
            using var content = new MultipartFormDataContent();
            var bytes = new byte[] { 0x89, 0x50, 0x4E, 0x47 }; // PNG signature stub
            var fileContent = new ByteArrayContent(bytes);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
            content.Add(fileContent, "logo", "fake.png");

            var response = await client.PostAsync("/api/global-settings/upload-logo", content);

            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                $"rol {role} jamas debe poder subir logo de plataforma");
            // 403 esperado por policy; 400/415 aceptables si el binder falla antes que el policy check
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.Forbidden,
                HttpStatusCode.BadRequest,
                HttpStatusCode.UnsupportedMediaType,
                HttpStatusCode.Unauthorized);
        }
    }
}
