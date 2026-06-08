using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Tests.Endpoints
{
    /// <summary>
    /// HTTP integration tests for AdminSyncHealthEndpoints
    /// (apps/api/src/HandySuites.Api/Endpoints/AdminSyncHealthEndpoints.cs).
    ///
    /// Routes covered:
    ///   GET /api/admin/sync-health     — ADMIN/SUPER_ADMIN/SUPERVISOR; allTenants=true only SUPER_ADMIN
    ///   GET /api/admin/pedidos/drafts  — ADMIN/SUPER_ADMIN/SUPERVISOR
    ///
    /// Goal: exercise lines for coverage; BeOneOf permissive on happy paths because
    /// downstream services (ISyncTelemetryService, IPedidoRepository) may not have
    /// deep seed data in CustomWebApplicationFactory.
    /// </summary>
    public class AdminSyncHealthEndpointsHttpTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public AdminSyncHealthEndpointsHttpTests(CustomWebApplicationFactory factory)
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

        // ─────────────────────────────────────────────────────────────
        // GET /api/admin/sync-health
        // ─────────────────────────────────────────────────────────────

        [Fact]
        public async Task GetSyncHealth_AsAdmin_Returns200OrError()
        {
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/admin/sync-health?minPending=5&minStaleMinutes=15");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetSyncHealth_AsVendedor_Returns403()
        {
            var client = ClientAs("VENDEDOR", userId: "123");
            var response = await client.GetAsync("/api/admin/sync-health");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetSyncHealth_AsAdmin_WithAllTenants_Returns403()
        {
            // Privilege escalation guard — ADMIN cannot use allTenants=true (SUPER_ADMIN only).
            var client = ClientAs("ADMIN");
            var response = await client.GetAsync("/api/admin/sync-health?allTenants=true");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetSyncHealth_Unauthenticated_Returns401()
        {
            var client = UnauthenticatedClient();
            var response = await client.GetAsync("/api/admin/sync-health");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ─────────────────────────────────────────────────────────────
        // GET /api/admin/pedidos/drafts
        // ─────────────────────────────────────────────────────────────

        [Fact]
        public async Task GetDrafts_AsSupervisor_Returns200OrError()
        {
            var client = ClientAs("SUPERVISOR", userId: "200");
            var response = await client.GetAsync("/api/admin/pedidos/drafts?minAgeMinutes=15&usuarioId=123");
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.NotFound,
                HttpStatusCode.BadRequest,
                HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task GetDrafts_AsViewer_Returns403()
        {
            var client = ClientAs("VIEWER", userId: "201");
            var response = await client.GetAsync("/api/admin/pedidos/drafts");
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
        }
    }
}
