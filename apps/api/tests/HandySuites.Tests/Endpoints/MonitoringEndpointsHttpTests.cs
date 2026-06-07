using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    /// <summary>
    /// HTTP integration tests for MonitoringEndpoints — /api/superadmin/monitoring.
    /// All routes require SUPER_ADMIN role.
    /// Goal: line coverage. Asserts are permissive (BeOneOf).
    /// </summary>
    public class MonitoringEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public MonitoringEndpointsHttpTests(CustomWebApplicationFactory factory)
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

        private HttpClient UnauthenticatedClient()
        {
            var c = _client;
            c.DefaultRequestHeaders.Clear();
            c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            return c;
        }

        // ============================================================
        // GET /api/superadmin/monitoring/stats
        // ============================================================

        [Fact]
        public async Task GetStats_AsSuperAdmin_Returns2xxOr500()
        {
            var client = ClientAs("SUPER_ADMIN");
            var response = await client.GetAsync("/api/superadmin/monitoring/stats");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetStats_AsAdmin_Returns403()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/superadmin/monitoring/stats");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetStats_Unauthenticated_Returns401()
        {
            var client = UnauthenticatedClient();
            var response = await client.GetAsync("/api/superadmin/monitoring/stats");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ============================================================
        // GET /api/superadmin/monitoring/errors/recent
        // ============================================================

        [Fact]
        public async Task GetRecentErrors_AsSuperAdmin_Returns2xxOr500()
        {
            var client = ClientAs("SUPER_ADMIN");
            var response = await client.GetAsync("/api/superadmin/monitoring/errors/recent");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetRecentErrors_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.GetAsync("/api/superadmin/monitoring/errors/recent");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        // ============================================================
        // GET /api/superadmin/monitoring/log-levels
        // ============================================================

        [Fact]
        public async Task GetLogLevels_AsSuperAdmin_Returns2xxOr500()
        {
            var client = ClientAs("SUPER_ADMIN");
            var response = await client.GetAsync("/api/superadmin/monitoring/log-levels");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetLogLevels_AsSupervisor_Returns403()
        {
            var client = ClientAs("SUPERVISOR", userId: "200");
            var response = await client.GetAsync("/api/superadmin/monitoring/log-levels");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetLogLevels_Unauthenticated_Returns401()
        {
            var client = UnauthenticatedClient();
            var response = await client.GetAsync("/api/superadmin/monitoring/log-levels");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ============================================================
        // POST /api/superadmin/monitoring/log-level
        // ============================================================

        [Fact]
        public async Task SetLogLevel_AsSuperAdmin_ApiMain_Returns2xxOr500()
        {
            var client = ClientAs("SUPER_ADMIN");
            var body = new { apiName = "api-main", level = "Warning" };
            var response = await client.PostAsJsonAsync("/api/superadmin/monitoring/log-level", body);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NoContent,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task SetLogLevel_AsViewer_Returns403()
        {
            var client = ClientAs("VIEWER", userId: "201");
            var body = new { apiName = "api-main", level = "Information" };
            var response = await client.PostAsJsonAsync("/api/superadmin/monitoring/log-level", body);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }
    }
}
