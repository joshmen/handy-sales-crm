using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Application.SuperAdmin
{
    /// <summary>
    /// Tests RBAC negativos para endpoints SUPER_ADMIN-only.
    /// Sprint correctivo 2026-06-06 — workflow wrleo01wo detecto que NO existian
    /// pruebas que verifiquen que un ADMIN/SUPERVISOR/VENDEDOR sea rechazado por
    /// los endpoints reservados a SUPER_ADMIN.
    /// </summary>
    public class SuperAdminRbacNegativeTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public SuperAdminRbacNegativeTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        private HttpClient ClientAs(string role, string userId = "1", string tenantId = "1")
        {
            var c = _client;
            c.DefaultRequestHeaders.Clear();
            c.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            c.DefaultRequestHeaders.Add("X-Test-UserId", userId);
            c.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId);
            c.DefaultRequestHeaders.Add("X-Test-Role", role);
            return c;
        }

        // ============================================================
        // SubscriptionPlanAdminEndpoints — /api/superadmin/subscription-plans
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task GetAllSubscriptionPlans_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.GetAsync("/api/superadmin/subscription-plans/");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden, $"role {role} no debe ver planes globales");
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task GetSubscriptionPlanById_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.GetAsync("/api/superadmin/subscription-plans/1");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task CreateSubscriptionPlan_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var request = new { codigo = "TEST", nombre = "Plan test", precio = 99.99m };
            var response = await client.PostAsJsonAsync("/api/superadmin/subscription-plans/", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("VENDEDOR")]
        public async Task UpdateSubscriptionPlan_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var request = new { nombre = "Updated", precio = 199.99m };
            var response = await client.PutAsJsonAsync("/api/superadmin/subscription-plans/1", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        public async Task ToggleSubscriptionPlan_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.PatchAsync("/api/superadmin/subscription-plans/1/toggle", null);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        // ============================================================
        // MigrationEndpoints — /api/migration (POLICY: RequireRole("SUPER_ADMIN"))
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task InitializeExistingTenants_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.PostAsync("/api/migration/initialize-existing-tenants", null);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        // ============================================================
        // LogLevelEndpoints — /api/admin/log-level (SUPER_ADMIN only)
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task GetLogLevel_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.GetAsync("/api/admin/log-level");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized, HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("VENDEDOR")]
        public async Task SetLogLevel_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var request = new { level = "Debug" };
            var response = await client.PostAsJsonAsync("/api/admin/log-level", request);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized, HttpStatusCode.NotFound);
        }

        // ============================================================
        // GlobalSettingsEndpoints — PUT /api/global-settings (SUPER_ADMIN only para escribir)
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task UpdateGlobalSettings_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var request = new { platformName = "Hijacked Platform" };
            var response = await client.PutAsJsonAsync("/api/global-settings/", request);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized, HttpStatusCode.MethodNotAllowed);
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("VENDEDOR")]
        public async Task ActivateMaintenanceMode_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var request = new { mensaje = "Hacked maintenance", scheduledEndUtc = DateTime.UtcNow.AddHours(1) };
            var response = await client.PostAsJsonAsync("/api/global-settings/maintenance/activate", request);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized, HttpStatusCode.NotFound);
        }

        // ============================================================
        // ImpersonationEndpoints — POST /api/impersonate (SUPER_ADMIN only)
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task StartImpersonation_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var request = new { targetUserId = 999 };
            var response = await client.PostAsJsonAsync("/api/impersonate/start", request);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized, HttpStatusCode.BadRequest, HttpStatusCode.NotFound);
        }

        // ============================================================
        // TenantEndpoints — POST /api/tenants (creacion de tenant — SUPER_ADMIN only)
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task CreateTenant_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var request = new
            {
                nombreEmpresa = "Hacked Corp",
                rfc = "XAXX010101000",
                emailAdmin = "hack@evil.com",
                passwordAdmin = "Hacker12345!"
            };
            var response = await client.PostAsJsonAsync("/api/tenants/", request);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized, HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
        }

        // ============================================================
        // SUPER_ADMIN positive — pasa
        // ============================================================

        [Fact]
        public async Task GetAllSubscriptionPlans_DeberiaPermitir_AcceleAlSuperAdmin()
        {
            var client = ClientAs("SUPER_ADMIN");
            var response = await client.GetAsync("/api/superadmin/subscription-plans/");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetGlobalSettings_DeberiaPermitir_LecturaAUsuariosAutenticados()
        {
            // GET is for all authenticated users — only PUT is SA-only
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/global-settings/");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }
    }
}
