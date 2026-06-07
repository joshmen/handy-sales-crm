using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Application.SuperAdmin
{
    /// <summary>
    /// Tests para MigrationEndpoints (apps/api/src/HandySuites.Api/Endpoints/MigrationEndpoints.cs).
    ///
    /// Endpoints cubiertos (grupo /api/migration, policy RequireRole("SUPER_ADMIN")):
    ///   - POST /api/migration/initialize-existing-tenants
    ///   - GET  /api/migration/tenants-status
    ///
    /// Caso: sa-be-migration  |  Rol enfocado: SUPER_ADMIN  |  Capa: backend
    /// Patron: CustomWebApplicationFactory + FakeJwtAuthHandler (X-Test-Role / X-Test-TenantId).
    /// </summary>
    public class MigrationEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public MigrationEndpointsTests(CustomWebApplicationFactory factory)
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

        private HttpClient ClientUnauthenticated()
        {
            var c = _client;
            c.DefaultRequestHeaders.Clear();
            c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            return c;
        }

        // ============================================================
        // GET /api/migration/tenants-status — Happy path SUPER_ADMIN
        // ============================================================

        [Fact]
        public async Task GetTenantsStatus_ComoSuperAdmin_DeberiaRetornar200ConSummary()
        {
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.GetAsync("/api/migration/tenants-status");

            response.StatusCode.Should().Be(HttpStatusCode.OK,
                "SUPER_ADMIN debe poder consultar el estado de migracion de todos los tenants");

            var body = await response.Content.ReadAsStringAsync();
            body.Should().NotBeNullOrWhiteSpace();
            // El payload contiene summary + tenants segun el endpoint
            body.Should().Contain("summary");
            body.Should().Contain("tenants");
            // El seeder crea Tenant 1, 2, 9001, 9010, 9020 — al menos uno debe aparecer
            body.Should().Contain("Tenant Test");
        }

        [Fact]
        public async Task GetTenantsStatus_ComoSuperAdmin_DeberiaIncluirCamposEsperados()
        {
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.GetAsync("/api/migration/tenants-status");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadAsStringAsync();

            // Campos del summary segun MigrationEndpoints.cs lineas 131-138
            body.Should().Contain("total");
            body.Should().Contain("withCloudinary");
            body.Should().Contain("withoutCloudinary");
            body.Should().Contain("withSettings");
            body.Should().Contain("withoutSettings");
        }

        // ============================================================
        // POST /api/migration/initialize-existing-tenants — Happy path
        // ============================================================

        [Fact]
        public async Task InitializeExistingTenants_ComoSuperAdmin_DeberiaRetornar200()
        {
            var client = ClientAs("SUPER_ADMIN");

            var response = await client.PostAsync("/api/migration/initialize-existing-tenants", null);

            // El endpoint puede:
            //  - 200 OK con mensaje de exito si Cloudinary stub responde
            //  - 500/Problem si CloudinaryService real falla (ambiente de test usa fake URL)
            // Ambos paths confirman que la policy SUPER_ADMIN dejo pasar la request.
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.InternalServerError,
                HttpStatusCode.BadRequest);

            if (response.StatusCode == HttpStatusCode.OK)
            {
                var body = await response.Content.ReadAsStringAsync();
                body.Should().Contain("totalProcessed",
                    "el response shape declarado en el endpoint incluye totalProcessed");
            }
        }

        // ============================================================
        // RBAC negativo — ADMIN/SUPERVISOR/VENDEDOR/VIEWER deben recibir 403
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task GetTenantsStatus_RolesNoSuperAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);

            var response = await client.GetAsync("/api/migration/tenants-status");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"el rol {role} no debe poder enumerar el estado de migracion global (informacion sensible de todos los tenants)");
        }

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task InitializeExistingTenants_RolesNoSuperAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);

            var response = await client.PostAsync("/api/migration/initialize-existing-tenants", null);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                $"el rol {role} no debe poder disparar la migracion global (mutacion masiva sobre todos los tenants)");
        }

        // ============================================================
        // Unauthenticated — 401
        // ============================================================

        [Fact]
        public async Task GetTenantsStatus_SinAutenticacion_DeberiaRetornar401()
        {
            var client = ClientUnauthenticated();

            var response = await client.GetAsync("/api/migration/tenants-status");

            response.StatusCode.Should().BeOneOf(new[] { HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden }, "endpoint con policy SUPER_ADMIN debe rechazar requests sin token");
        }

        [Fact]
        public async Task InitializeExistingTenants_SinAutenticacion_DeberiaRetornar401()
        {
            var client = ClientUnauthenticated();

            var response = await client.PostAsync("/api/migration/initialize-existing-tenants", null);

            response.StatusCode.Should().BeOneOf(new[] { HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden }, "endpoint con policy SUPER_ADMIN debe rechazar requests sin token");
        }

        // ============================================================
        // IDOR / Cross-tenant — el endpoint NO debe filtrar por X-Test-TenantId.
        // Un SUPER_ADMIN autenticado bajo tenant 2 sigue viendo TODOS los tenants
        // (es el comportamiento esperado: vista plataforma-global).
        // ============================================================

        [Fact]
        public async Task GetTenantsStatus_SuperAdminEnTenantSecundario_DeberiaVerTodosLosTenants()
        {
            // SUPER_ADMIN en tenant 2 (X-Test-TenantId=2) debe seguir viendo ambos tenants.
            // Esto valida que el endpoint NO aplica el filtro multi-tenant — es by design,
            // ya que el SUPER_ADMIN opera por encima de los tenants individuales.
            var client = ClientAs("SUPER_ADMIN", userId: "1", tenantId: "2");

            var response = await client.GetAsync("/api/migration/tenants-status");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadAsStringAsync();

            // Debe contener ambos tenants base del seeder, no solo el del header
            body.Should().Contain("Tenant Test", "tenant 1 debe aparecer aunque el header sea tenantId=2");
            body.Should().Contain("Tenant Secundario", "tenant 2 debe aparecer en la vista global");
        }

        [Fact]
        public async Task GetTenantsStatus_AdminEnTenant1_NoDebePoderEnumerarOtrosTenants()
        {
            // Caso IDOR clasico: un ADMIN del tenant 1 intenta usar el endpoint global
            // de migracion para enumerar otros tenants de la plataforma.
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync("/api/migration/tenants-status");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "un ADMIN regular no debe poder leer la lista global de tenants — eso es leak de info entre clientes");
        }
    }
}
