using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Application.Companies
{
    /// <summary>
    /// Tests RBAC para CompanyEndpoints — /api/companies (cross-tenant management).
    ///
    /// Inventory HIGH gap (2026-06-06): no existian pruebas para los endpoints
    /// /api/companies (GET listado cross-tenant, GET por id, POST crear tenant,
    /// PUT actualizar, DELETE eliminar). Si el guard IsSuperAdmin se rompe en
    /// refactor — p.ej. cambiarlo por IsStrictAdmin / IsAdminOrAbove — un ADMIN
    /// podria listar/crear/eliminar tenants de TODO el SaaS (IDOR catastrofico).
    ///
    /// CompanyEndpoints.cs (apps/api/src/HandySuites.Api/Endpoints/CompanyEndpoints.cs):
    ///   GET    /api/companies           — SUPER_ADMIN only (line 398)
    ///   GET    /api/companies/{id}      — SUPER_ADMIN any / ADMIN solo su tenant (lines 433-444)
    ///   POST   /api/companies           — SUPER_ADMIN only (line 465)
    ///   PUT    /api/companies/{id}      — SUPER_ADMIN any / ADMIN solo su tenant (lines 519-536)
    ///   DELETE /api/companies/{id}      — SUPER_ADMIN only (line 558)
    /// </summary>
    public class CompanyEndpointsRbacTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public CompanyEndpointsRbacTests(CustomWebApplicationFactory factory)
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

        private static object SampleCreateDto() => new
        {
            tenantId = 9999,
            companyName = "Hacked Tenant SA de CV",
            companyDescription = "Tenant fantasma creado por ADMIN",
            contactEmail = "hack@evil.com",
            contactPhone = "5555555555",
            country = "México",
            timezone = "America/Mexico_City",
            currency = "MXN",
            subscriptionPlan = "BASIC"
        };

        private static object SampleUpdateDto() => new
        {
            companyName = "Renamed by attacker",
            companyDescription = "Cross-tenant update intento"
        };

        // ============================================================
        // GET /api/companies — listado cross-tenant (SUPER_ADMIN only)
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task GetAllCompanies_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.GetAsync("/api/companies/");
            response.StatusCode.Should().Be(
                HttpStatusCode.Forbidden,
                $"role {role} jamas debe listar todos los tenants del SaaS (IDOR cross-tenant)");
        }

        [Fact]
        public async Task GetAllCompanies_SinAuth_DeberiaRetornar401()
        {
            // Sin headers de test → no auth header
            _client.DefaultRequestHeaders.Clear();
            var response = await _client.GetAsync("/api/companies/");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetAllCompanies_DeberiaPermitir_AccesoAlSuperAdmin()
        {
            var client = ClientAs("SUPER_ADMIN");
            var response = await client.GetAsync("/api/companies/");
            // 200 OK con listado, 204 si vacio, 404 si endpoint no encontro datos
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NoContent,
                HttpStatusCode.NotFound);
        }

        // ============================================================
        // GET /api/companies/{id} — SUPER_ADMIN any tenant / ADMIN solo el suyo
        // ============================================================

        [Theory]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task GetCompanyById_DeberiaRetornar403_ParaRolesNoAdminNiSuperAdmin(string role)
        {
            var client = ClientAs(role, tenantId: "1");
            var response = await client.GetAsync("/api/companies/1");
            // 403 si el guard lo rechaza, 404 si el id no existe en DB de test antes del guard.
            // Lo critico: NO debe retornar 200.
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                $"role {role} no debe ver detalles de ningun tenant");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.Forbidden,
                HttpStatusCode.NotFound,
                HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetCompanyById_AdminCrossTenant_DeberiaRetornar403()
        {
            // ADMIN del tenant 1 intenta leer tenant 2 → debe ser 403 o 404
            var client = ClientAs("ADMIN", tenantId: "1");
            var response = await client.GetAsync("/api/companies/2");
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "ADMIN no debe leer datos de otro tenantId");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.Forbidden,
                HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetCompanyById_SuperAdmin_IdInexistente_DeberiaRetornar404()
        {
            var client = ClientAs("SUPER_ADMIN");
            var response = await client.GetAsync("/api/companies/99999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound,
                "SUPER_ADMIN buscando id inexistente debe ver 404 (no 403, no 500)");
        }

        // ============================================================
        // POST /api/companies — crear tenant (SUPER_ADMIN only)
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task CreateCompany_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.PostAsJsonAsync("/api/companies/", SampleCreateDto());
            response.StatusCode.Should().Be(
                HttpStatusCode.Forbidden,
                $"role {role} jamas debe crear tenants fantasma");
        }

        [Fact]
        public async Task CreateCompany_SinAuth_DeberiaRetornar401()
        {
            _client.DefaultRequestHeaders.Clear();
            var response = await _client.PostAsJsonAsync("/api/companies/", SampleCreateDto());
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
        }

        // ============================================================
        // PUT /api/companies/{id} — actualizar (SUPER_ADMIN any / ADMIN solo su tenant)
        // ============================================================

        [Theory]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task UpdateCompany_DeberiaRetornar403_ParaRolesNoAdminNiSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.PutAsJsonAsync("/api/companies/1", SampleUpdateDto());
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                $"role {role} no debe actualizar datos de empresa");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.Forbidden,
                HttpStatusCode.NotFound,
                HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task UpdateCompany_AdminCrossTenant_DeberiaRetornar403()
        {
            // ADMIN del tenant 1 intenta actualizar tenant 2 → 403 o 404
            var client = ClientAs("ADMIN", tenantId: "1");
            var response = await client.PutAsJsonAsync("/api/companies/2", SampleUpdateDto());
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "ADMIN no debe modificar el tenantId 2 si su sesion es tenantId 1");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.Forbidden,
                HttpStatusCode.NotFound);
        }

        // ============================================================
        // DELETE /api/companies/{id} — eliminar tenant (SUPER_ADMIN only)
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task DeleteCompany_DeberiaRetornar403_ParaRolesNoSuperAdmin(string role)
        {
            var client = ClientAs(role);
            var response = await client.DeleteAsync("/api/companies/1");
            response.StatusCode.Should().Be(
                HttpStatusCode.Forbidden,
                $"role {role} JAMAS debe eliminar tenants (riesgo: competidores)");
        }

        [Fact]
        public async Task DeleteCompany_AdminMismoTenant_DeberiaRetornar403()
        {
            // Aunque ADMIN sea del tenantId 1, NO debe poder borrar ni siquiera su propio tenant.
            // El guard de DELETE exige IsSuperAdmin (sin excepcion por tenant propio).
            var client = ClientAs("ADMIN", tenantId: "1");
            var response = await client.DeleteAsync("/api/companies/1");
            response.StatusCode.Should().Be(
                HttpStatusCode.Forbidden,
                "ADMIN no puede auto-eliminar su tenant ni ningun otro");
        }

        [Fact]
        public async Task DeleteCompany_SinAuth_DeberiaRetornar401()
        {
            _client.DefaultRequestHeaders.Clear();
            var response = await _client.DeleteAsync("/api/companies/1");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
        }

        // ============================================================
        // SUPER_ADMIN positive smoke — los endpoints estan vivos
        // ============================================================

        [Fact]
        public async Task GetCompanyById_SuperAdmin_DeberiaResponder_2xxO404()
        {
            // Smoke: el endpoint responde, no 500 ni 403 al SA.
            var client = ClientAs("SUPER_ADMIN");
            var response = await client.GetAsync("/api/companies/1");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound);
        }
    }
}
