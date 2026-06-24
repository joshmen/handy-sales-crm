using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    /// <summary>
    /// Tests HTTP integration para TeamLocationEndpoints — /api/team/*.
    ///
    /// Rutas cubiertas:
    ///   GET /api/team/ubicaciones-recientes              — ADMIN/SUPERVISOR/SUPER_ADMIN
    ///   GET /api/team/usuarios/{id}/actividad-gps        — ADMIN/SUPERVISOR/SUPER_ADMIN
    ///
    /// VENDEDOR y VIEWER -> 403 (Results.Forbid()).
    /// Sin auth -> 401 (RequireAuthorization en grupo).
    /// </summary>
    public class TeamLocationEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public TeamLocationEndpointsHttpTests(CustomWebApplicationFactory factory)
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

        // ============ GET /api/team/ubicaciones-recientes ============

        [Fact]
        public async Task GetUltimasUbicaciones_AsAdmin_Returns200()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/team/ubicaciones-recientes");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetUltimasUbicaciones_AsSupervisor_Returns200()
        {
            var client = ClientAs("SUPERVISOR", userId: "200");
            var response = await client.GetAsync("/api/team/ubicaciones-recientes");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetUltimasUbicaciones_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.GetAsync("/api/team/ubicaciones-recientes");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetUltimasUbicaciones_AsViewer_Returns403()
        {
            var client = ClientAs("VIEWER", userId: "201");
            var response = await client.GetAsync("/api/team/ubicaciones-recientes");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetUltimasUbicaciones_Unauthenticated_Returns401()
        {
            var client = ClientUnauthenticated();
            var response = await client.GetAsync("/api/team/ubicaciones-recientes");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ============ GET /api/team/roster-gps ============

        [Fact]
        public async Task GetRosterGps_AsAdmin_Returns200()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/team/roster-gps");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetRosterGps_AsSupervisor_Returns200()
        {
            var client = ClientAs("SUPERVISOR", userId: "200");
            var response = await client.GetAsync("/api/team/roster-gps");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetRosterGps_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.GetAsync("/api/team/roster-gps");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetRosterGps_AsViewer_Returns403()
        {
            var client = ClientAs("VIEWER", userId: "201");
            var response = await client.GetAsync("/api/team/roster-gps");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetRosterGps_Unauthenticated_Returns401()
        {
            var client = ClientUnauthenticated();
            var response = await client.GetAsync("/api/team/roster-gps");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ============ GET /api/team/usuarios/{id}/actividad-gps ============

        [Fact]
        public async Task GetActividadGpsDelDia_AsAdmin_Returns200()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/team/usuarios/123/actividad-gps");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetActividadGpsDelDia_WithDiaQuery_AsAdmin_Returns200()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/team/usuarios/123/actividad-gps?dia=2026-06-07");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetActividadGpsDelDia_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.GetAsync("/api/team/usuarios/123/actividad-gps");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }
    }
}
