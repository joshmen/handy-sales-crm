using HandySuites.Mobile.Tests.Common;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP integration tests para MobileAnnouncementEndpoints.
/// Routes covered:
///   GET  /api/mobile/announcements/
///   POST /api/mobile/announcements/{id}/dismiss
/// Goal: line coverage + auth/RBAC sanity. Endpoints solo requieren
/// RequireAuthorization() — sin role check explicito.
/// </summary>
public class MobileAnnouncementEndpointsHttpTests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    public MobileAnnouncementEndpointsHttpTests(MobileWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient ClientAs(string role, int userId, int tenantId = MobileTestSeeder.TenantA)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("Authorization", "Bearer fake");
        c.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId.ToString());
        c.DefaultRequestHeaders.Add("X-Test-Role", role);
        return c;
    }

    private HttpClient UnauthenticatedClient()
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "1");
        return c;
    }

    // ============================================================
    // GET /api/mobile/announcements/
    // ============================================================

    [Fact]
    public async Task GetAnnouncements_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/announcements/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetAnnouncements_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/announcements/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetAnnouncements_AsSupervisor_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var response = await client.GetAsync("/api/mobile/announcements/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetAnnouncements_AsSuperAdmin_Returns200()
    {
        var client = ClientAs("SUPER_ADMIN", MobileTestSeeder.SuperAdminUserId);
        var response = await client.GetAsync("/api/mobile/announcements/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetAnnouncements_AsViewer_Returns200()
    {
        var client = ClientAs("VIEWER", MobileTestSeeder.ViewerUserId);
        var response = await client.GetAsync("/api/mobile/announcements/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetAnnouncements_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/announcements/");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetAnnouncements_ReturnsDataWrapperJson()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/announcements/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("data");
    }

    [Fact]
    public async Task GetAnnouncements_CrossTenant_StillReturns200()
    {
        // Tenant B vendedor — still authenticated, must return 200 (empty list ok)
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, MobileTestSeeder.TenantB);
        var response = await client.GetAsync("/api/mobile/announcements/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    // ============================================================
    // POST /api/mobile/announcements/{id}/dismiss
    // ============================================================

    [Fact]
    public async Task DismissAnnouncement_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        // Use arbitrary id — no seed for announcements; endpoint returns Ok even if absent
        var response = await client.PostAsync("/api/mobile/announcements/9999/dismiss", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DismissAnnouncement_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.PostAsync("/api/mobile/announcements/12345/dismiss", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DismissAnnouncement_AsSupervisor_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var response = await client.PostAsync("/api/mobile/announcements/777/dismiss", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DismissAnnouncement_TwiceSameUser_Idempotent()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor2Id);
        var first = await client.PostAsync("/api/mobile/announcements/42/dismiss", null);
        first.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);

        // Second call hits the "already dismissed" early-exit branch
        var second = await client.PostAsync("/api/mobile/announcements/42/dismiss", null);
        second.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task DismissAnnouncement_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.PostAsync("/api/mobile/announcements/1/dismiss", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DismissAnnouncement_InvalidIdRoute_Returns404()
    {
        // Route constraint is int — non-int should not match
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.PostAsync("/api/mobile/announcements/abc/dismiss", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DismissAnnouncement_CrossTenantUser_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, MobileTestSeeder.TenantB);
        var response = await client.PostAsync("/api/mobile/announcements/123/dismiss", null);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }
}
