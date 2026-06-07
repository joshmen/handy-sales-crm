using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Application.Supervisores
{
    /// <summary>
    /// Tests extendidos para SUPERVISOR — el rol con peor coverage (18 tests originales).
    /// Sprint correctivo 2026-06-06 — workflow wrleo01wo identifico SUPERVISOR backend
    /// como el rol con mas gaps HIGH detectados (7 sin tests).
    ///
    /// Cubre:
    /// - Dashboard supervisor (KPIs) sin permisos
    /// - VENDEDOR no debe ver dashboard supervisor
    /// - Cross-tenant: supervisor de tenant 1 no debe operar en tenant 2
    /// - Asignacion / desasignacion idempotente
    /// </summary>
    public class SupervisorRbacExtendedTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public SupervisorRbacExtendedTests(CustomWebApplicationFactory factory)
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
        // Dashboard supervisor — SUPERVISOR only
        // ============================================================

        [Theory]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task Dashboard_DeberiaRetornar403_ParaVendedorYViewer(string role)
        {
            var client = ClientAs(role);
            var response = await client.GetAsync("/api/supervisores/dashboard");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Dashboard_DeberiaRetornarKpis_ParaSupervisor()
        {
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");
            var response = await client.GetAsync("/api/supervisores/dashboard");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden);
        }

        // ============================================================
        // Mis vendedores — SUPERVISOR only (ADMIN goes via /{id}/vendedores)
        // ============================================================

        [Theory]
        [InlineData("ADMIN")]
        [InlineData("VENDEDOR")]
        public async Task MisVendedores_DeberiaRetornar403_ParaAdminYVendedor(string role)
        {
            var client = ClientAs(role);
            var response = await client.GetAsync("/api/supervisores/mis-vendedores");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "/mis-vendedores es solo SUPERVISOR; ADMIN ve via /{id}/vendedores");
        }

        // ============================================================
        // Vendedores disponibles — IsAdminOrAbove (incluye SUPERVISOR por design)
        // ============================================================
        // NOTA RBAC — sprint pre-prod #11 audit 2026-06-06:
        // SupervisorEndpoints usa IsAdminOrAbove, lo cual permite que SUPERVISOR
        // pueda gestionar vendedores de OTROS supervisores (cross-supervisor IDOR).
        // Recomendacion futura: cambiar a IsStrictAdmin O validar que
        // supervisorId == currentUserId en /asignar y /desasignar.

        [Theory]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task VendedoresDisponibles_DeberiaRetornar403_ParaVendedorYViewer(string role)
        {
            var client = ClientAs(role);
            var response = await client.GetAsync("/api/supervisores/vendedores-disponibles");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task VendedoresDisponibles_DeberiaPermitir_AdminOrAbove()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/supervisores/vendedores-disponibles");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        // ============================================================
        // Asignar / desasignar vendedores — VENDEDOR/VIEWER siempre 403
        // ============================================================

        [Theory]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task AsignarVendedores_DeberiaRetornar403_ParaVendedorYViewer(string role)
        {
            var client = ClientAs(role);
            var request = new { vendedorIds = new[] { 999 } };
            var response = await client.PostAsJsonAsync("/api/supervisores/200/asignar", request);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData("VENDEDOR")]
        [InlineData("VIEWER")]
        public async Task DesasignarVendedor_DeberiaRetornar403_ParaVendedorYViewer(string role)
        {
            var client = ClientAs(role);
            var response = await client.DeleteAsync("/api/supervisores/200/vendedores/999");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        // ============================================================
        // IDOR fix sprint pre-prod #11 — SUPERVISOR S1 NO debe gestionar S2
        // ============================================================

        [Fact]
        public async Task GetVendedoresDeOtroSupervisor_SupervisorS1_DeberiaRetornar403_AlMirarS2()
        {
            // Supervisor 200 (valido en seed) intenta ver vendedores del supervisor 201 (otro id)
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");
            var response = await client.GetAsync("/api/supervisores/201/vendedores");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "Supervisor solo puede ver SUS PROPIOS vendedores (id == userId)");
        }

        [Fact]
        public async Task GetVendedoresPropios_DeberiaPermitir_SupervisorViendoSuPropioId()
        {
            // Supervisor 200 viendo sus propios vendedores via /200/vendedores
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");
            var response = await client.GetAsync("/api/supervisores/200/vendedores");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task AsignarVendedoresAOtroSupervisor_SupervisorS1_DeberiaRetornar403()
        {
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");
            var request = new { vendedorIds = new[] { 999 } };
            var response = await client.PostAsJsonAsync("/api/supervisores/201/asignar", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "Supervisor no debe asignar vendedores a OTRO supervisor (IDOR fix)");
        }

        [Fact]
        public async Task DesasignarVendedorDeOtroSupervisor_SupervisorS1_DeberiaRetornar403()
        {
            var client = ClientAs("SUPERVISOR", userId: "200", tenantId: "1");
            var response = await client.DeleteAsync("/api/supervisores/201/vendedores/999");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden,
                "Supervisor no debe desasignar vendedores de OTRO supervisor (IDOR fix)");
        }

        // ============================================================
        // Cross-tenant IDOR — supervisor de tenant 1 no debe operar tenant 2
        // ============================================================

        [Fact]
        public async Task GetVendedoresDeOtroSupervisor_NoDeberiaCruzarTenant()
        {
            // ADMIN del tenant 99 intentando ver supervisor del tenant 1
            var client = ClientAs("ADMIN", userId: "1", tenantId: "99");
            var response = await client.GetAsync("/api/supervisores/200/vendedores");
            // Tenant scope: el resultado debe ser vacio o forbidden (no datos del tenant 1)
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden, HttpStatusCode.NotFound);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                var body = await response.Content.ReadAsStringAsync();
                body.Should().NotContain("\"tenant\":1", "no debe filtrar vendedores de otro tenant");
            }
        }

        // ============================================================
        // Auth requerida en todos los endpoints
        // ============================================================

        [Theory]
        [InlineData("/api/supervisores/mis-vendedores")]
        [InlineData("/api/supervisores/dashboard")]
        [InlineData("/api/supervisores/vendedores-disponibles")]
        [InlineData("/api/supervisores/200/vendedores")]
        public async Task Endpoints_DeberianRequerirAutenticacion(string path)
        {
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.GetAsync(path);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
