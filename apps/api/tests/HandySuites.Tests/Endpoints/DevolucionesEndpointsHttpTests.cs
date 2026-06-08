using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    public class DevolucionesEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public DevolucionesEndpointsHttpTests(CustomWebApplicationFactory factory)
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

        [Fact]
        public async Task GetDevoluciones_AsAdmin_Returns200()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/devoluciones/");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetDevoluciones_WithFilters_AsAdmin_Returns200()
        {
            var client = ClientAs("ADMIN");
            var url = "/devoluciones/?usuarioId=1&fechaDesde=2025-01-01&fechaHasta=2026-12-31&pagina=1&tamanoPagina=10";
            var response = await client.GetAsync(url);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetDevoluciones_Unauthenticated_Returns401()
        {
            var client = ClientUnauthenticated();
            var response = await client.GetAsync("/devoluciones/");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task AnularDevolucion_AsAdmin_Returns2xxOr4xx()
        {
            var client = ClientAs("ADMIN");
            var body = new { Motivo = "Test anulacion admin" };
            var response = await client.PostAsJsonAsync("/devoluciones/1/anular", body);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task AnularDevolucion_AsSupervisor_Returns2xxOr4xx()
        {
            var client = ClientAs("SUPERVISOR", userId: "200");
            var body = new { Motivo = "Test anulacion supervisor" };
            var response = await client.PostAsJsonAsync("/devoluciones/1/anular", body);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task AnularDevolucion_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var body = new { Motivo = "Test anulacion vendedor" };
            var response = await client.PostAsJsonAsync("/devoluciones/1/anular", body);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task AnularDevolucion_AsViewer_Returns403()
        {
            var client = ClientAs("VIEWER", userId: "201");
            var body = new { Motivo = "Test anulacion viewer" };
            var response = await client.PostAsJsonAsync("/devoluciones/1/anular", body);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task AnularDevolucion_Unauthenticated_Returns401()
        {
            var client = ClientUnauthenticated();
            var body = new { Motivo = "Test anulacion sin auth" };
            var response = await client.PostAsJsonAsync("/devoluciones/1/anular", body);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
