using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Application.Companies
{
    /// <summary>
    /// Tests para /api/companies/{id} GET y PUT.
    /// Verifica isolation: ADMIN solo puede ver/modificar su propio tenant,
    /// SUPER_ADMIN puede cross-tenant.
    /// El seeder crea Tenant 1 y Tenant 2.
    /// </summary>
    public class CompaniesAdminCrossTenantIsolationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public CompaniesAdminCrossTenantIsolationTests(CustomWebApplicationFactory factory)
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
        // GET /api/companies/{id}
        // ============================================================

        [Fact]
        public async Task GetCompanyById_ComoAdminTenantA_PropioTenant_DeberiaRetornar200()
        {
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync("/api/companies/1");

            // 200 si Company existe en la BD. 404 si CompanyService no encuentra Company
            // (puede no estar seedeado como entidad Company, solo como Tenant).
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetCompanyById_ComoAdminTenantA_CrossTenant_DeberiaSer403o404()
        {
            // ADMIN de tenant 1 intenta consultar company de tenant 2 (id != tenantId del JWT).
            // CompanyService.GetByIdAsync retorna company con TenantId=2; el guard rechaza
            // ADMIN si company.TenantId != currentTenant.TenantId.
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync("/api/companies/2");

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.Forbidden,  // explicit guard reject
                HttpStatusCode.NotFound);  // company no existe en CompanyService

            // CRITICAL: NUNCA debe ser 200 con datos de tenant ajeno
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "BUG / FIX TODO: si esto falla, hay cross-tenant data leak en GET /api/companies/{id}");
        }

        [Fact]
        public async Task GetCompanyById_ComoSuperAdmin_CualquierTenant_DeberiaRetornar200()
        {
            var client = ClientAs("SUPER_ADMIN", userId: "1", tenantId: "1");

            var response = await client.GetAsync("/api/companies/2");

            // SuperAdmin pasa el guard. 404 solo si CompanyService no encontro company.
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden);
        }

        // ============================================================
        // PUT /api/companies/{id}
        // ============================================================

        [Fact]
        public async Task PutCompanyById_ComoAdminTenantA_CrossTenant_DeberiaSer403o404()
        {
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var dto = new
            {
                CompanyName = "Hijacked Company",
                ContactEmail = "hacker@evil.com"
            };

            var response = await client.PutAsJsonAsync("/api/companies/2", dto);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.Forbidden,
                HttpStatusCode.NotFound);

            // CRITICAL: NUNCA debe ser 200 — significaria que ADMIN modifico tenant ajeno
            response.StatusCode.Should().NotBe(HttpStatusCode.OK,
                "CRITICAL: ADMIN no debe poder modificar empresa de otro tenant");
        }

        [Fact]
        public async Task PutCompanyById_ComoAdminTenantA_PropioTenant_DeberiaRetornar200_o404()
        {
            var client = ClientAs("ADMIN", userId: "1", tenantId: "1");
            var dto = new
            {
                CompanyName = "Mi empresa actualizada",
                ContactEmail = "admin@mi-empresa.com"
            };

            var response = await client.PutAsJsonAsync("/api/companies/1", dto);

            // 200 si actualizo, 404 si Company no existe (seeder solo crea Tenant).
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.BadRequest,
                HttpStatusCode.NotFound);
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                "ADMIN debe poder modificar su propio tenant");
        }

        [Fact]
        public async Task PutCompanyById_ComoSuperAdmin_CualquierTenant_DeberiaProcesarse()
        {
            var client = ClientAs("SUPER_ADMIN", userId: "1", tenantId: "1");
            var dto = new
            {
                CompanyName = "Cross tenant admin update",
            };

            var response = await client.PutAsJsonAsync("/api/companies/2", dto);

            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.BadRequest,
                HttpStatusCode.NotFound);
            response.StatusCode.Should().NotBe(HttpStatusCode.Forbidden,
                "SUPER_ADMIN debe poder modificar cualquier tenant");
        }

        // ============================================================
        // GET /api/companies (list) — solo SUPER_ADMIN
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task GetAllCompanies_ConRolesNoSuperAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);
            var response = await client.GetAsync("/api/companies/");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        // ============================================================
        // POST /api/companies — solo SUPER_ADMIN
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("SUPERVISOR")]
        [InlineData("VENDEDOR")]
        public async Task CreateCompany_ConRolesNoSuperAdmin_DeberiaRetornar403(string role)
        {
            var client = ClientAs(role);
            var dto = new
            {
                CompanyName = "Nueva empresa hackeada",
                ContactEmail = "hack@evil.com",
                TenantId = 999
            };
            var response = await client.PostAsJsonAsync("/api/companies/", dto);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.BadRequest);
        }
    }
}
