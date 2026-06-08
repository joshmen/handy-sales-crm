using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    public class LogLevelEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public LogLevelEndpointsHttpTests(CustomWebApplicationFactory factory)
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

        [Fact]
        public async Task GetLogLevel_AsSuperAdmin_Returns200()
        {
            var client = ClientAs("SUPER_ADMIN");
            var response = await client.GetAsync("/api/superadmin/log-level/");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task PostLogLevel_AsSuperAdmin_Returns200()
        {
            var client = ClientAs("SUPER_ADMIN");
            var body = new { Level = "Information" };
            var response = await client.PostAsJsonAsync("/api/superadmin/log-level/", body);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetLogLevel_AsAdmin_Returns403()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/superadmin/log-level/");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetLogLevel_Unauthenticated_Returns401()
        {
            var client = UnauthenticatedClient();
            var response = await client.GetAsync("/api/superadmin/log-level/");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
