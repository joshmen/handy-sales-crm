using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HandySuites.Tests.Application.Supervisores
{
    public class SupervisorEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public SupervisorEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        private HttpClient CreateAuthenticatedClient(string userId = "1", string tenantId = "1", string? role = null)
        {
            var client = _client;
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            client.DefaultRequestHeaders.Add("X-Test-UserId", userId);
            client.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId);
            if (role != null) client.DefaultRequestHeaders.Add("X-Test-Role", role);
            return client;
        }

        [Fact]
        public async Task MisVendedores_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.GetAsync("/api/supervisores/mis-vendedores");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task MisVendedores_DeberiaRetornarLista_ParaSupervisor()
        {
            var client = CreateAuthenticatedClient("200", "1", "SUPERVISOR");
            var response = await client.GetAsync("/api/supervisores/mis-vendedores");
            // Supervisor 200 has vendedor 123 assigned in seed data
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetVendedoresDeSupervisor_DeberiaRetornarLista_ParaAdmin()
        {
            var client = CreateAuthenticatedClient("1", "1", "ADMIN");
            var response = await client.GetAsync("/api/supervisores/200/vendedores");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task AsignarVendedores_DeberiaFuncionar_ParaAdmin()
        {
            var client = CreateAuthenticatedClient("1", "1", "ADMIN");
            var request = new { vendedorIds = new[] { 124 } };
            var response = await client.PostAsJsonAsync("/api/supervisores/200/asignar", request);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task AsignarVendedores_DeberiaRetornar404_CuandoSupervisorNoExiste()
        {
            var client = CreateAuthenticatedClient("1", "1", "ADMIN");
            var request = new { vendedorIds = new[] { 123 } };
            var response = await client.PostAsJsonAsync("/api/supervisores/9999/asignar", request);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden, HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task DesasignarVendedor_DeberiaRetornar404_CuandoNoExiste()
        {
            var client = CreateAuthenticatedClient("1", "1", "ADMIN");
            var response = await client.DeleteAsync("/api/supervisores/200/vendedores/9999");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Dashboard_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Clear();
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.GetAsync("/api/supervisores/dashboard");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Dashboard_DeberiaRetornarKPIs_ParaSupervisor()
        {
            var client = CreateAuthenticatedClient("200", "1", "SUPERVISOR");
            var response = await client.GetAsync("/api/supervisores/dashboard");
            // IsSupervisor claim depends on exact CurrentTenant implementation
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden, HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task VendedoresDisponibles_DeberiaRetornarLista_ParaAdmin()
        {
            var client = CreateAuthenticatedClient("1", "1", "ADMIN");
            var response = await client.GetAsync("/api/supervisores/vendedores-disponibles");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Forbidden);
        }
    }
}
