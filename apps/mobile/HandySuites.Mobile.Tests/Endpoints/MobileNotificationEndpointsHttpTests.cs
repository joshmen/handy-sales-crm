using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Mobile.Tests.Common;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests HTTP reales para <c>MobileNotificationEndpoints</c>
/// (apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileNotificationEndpoints.cs).
///
/// Endpoint surface (base /api/mobile/notifications):
///   POST /send  -> envia push (ADMIN/SUPER_ADMIN/SUPERVISOR)
///   POST /test  -> envia push de prueba al user autenticado
///   GET  /      -> historial del user
///
/// Goal: line coverage de las lambdas via MobileWebApplicationFactory (SQLite + FakeJwt).
/// PushNotificationService usa HttpClient stubbed; el servicio puede no encontrar devices
/// en seed minimo y devolver success=false con deviceCount=0 — el endpoint igual retorna 200.
/// </summary>
public class MobileNotificationEndpointsHttpTests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    static MobileNotificationEndpointsHttpTests()
    {
        // JwtExtensions reads from config early during Program.cs; the factory's
        // ConfigureAppConfiguration sometimes runs after this. Set env vars
        // statically so JwtExtensions always finds the secret.
        Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
        Environment.SetEnvironmentVariable("JWT_SECRET", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("BILLING_API_URL", "http://billing.test");
        Environment.SetEnvironmentVariable("MAIN_API_URL", "http://main.test");
    }

    public MobileNotificationEndpointsHttpTests(MobileWebApplicationFactory factory)
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

    private HttpClient ClientUnauthenticated()
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "1");
        return c;
    }

    // -------------------------------------------------------------------------
    // POST /api/mobile/notifications/send
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PostSend_AsAdmin_ToAllTenant_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new
        {
            title = "Promo",
            body = "Nuevo descuento disponible"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/send", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PostSend_AsSuperAdmin_ToSingleUser_Returns200()
    {
        var client = ClientAs("SUPER_ADMIN", MobileTestSeeder.SuperAdminUserId);
        var body = new
        {
            title = "Hola",
            body = "Mensaje directo",
            userId = MobileTestSeeder.Vendedor1Id,
            type = "info"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/send", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PostSend_AsSupervisor_ToUserIds_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var body = new
        {
            title = "Equipo",
            body = "Reunion en 10 min",
            userIds = new[] { MobileTestSeeder.Vendedor1Id, MobileTestSeeder.Vendedor2Id },
            type = "team",
            data = new Dictionary<string, string> { { "url", "/team" } }
        };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/send", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PostSend_AsVendedor_Returns403()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { title = "X", body = "Y" };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/send", body);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostSend_AsViewer_Returns403()
    {
        var client = ClientAs("VIEWER", MobileTestSeeder.ViewerUserId);
        var body = new { title = "X", body = "Y" };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/send", body);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostSend_Unauthenticated_Returns401()
    {
        var client = ClientUnauthenticated();
        var body = new { title = "X", body = "Y" };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/send", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // -------------------------------------------------------------------------
    // POST /api/mobile/notifications/test
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PostTest_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new { title = "Test", body = "Prueba" };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/test", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PostTest_AsAdmin_WithEmptyBody_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        // Allow nulls => use endpoint defaults ("Prueba de notificación", etc.)
        var body = new { title = (string?)null, body = (string?)null };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/test", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PostTest_AsSupervisor_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var body = new { title = "T", body = "B" };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/test", body);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task PostTest_Unauthenticated_Returns401()
    {
        var client = ClientUnauthenticated();
        var body = new { title = "T", body = "B" };
        var response = await client.PostAsJsonAsync("/api/mobile/notifications/test", body);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // -------------------------------------------------------------------------
    // GET /api/mobile/notifications/
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetHistory_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/notifications/");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHistory_AsAdmin_WithSinceAndLimit_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var since = DateTime.UtcNow.AddDays(-7).ToString("o");
        var response = await client.GetAsync($"/api/mobile/notifications/?since={Uri.EscapeDataString(since)}&limit=50");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHistory_AsSupervisor_WithLimitOverMax_ClampsTo500_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        // limit=9999 ejercita Math.Clamp(..., 1, 500)
        var response = await client.GetAsync("/api/mobile/notifications/?limit=9999");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHistory_AsViewer_Returns200()
    {
        var client = ClientAs("VIEWER", MobileTestSeeder.ViewerUserId);
        var response = await client.GetAsync("/api/mobile/notifications/?limit=10");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHistory_AsVendedor_WithSinceFarPast_ClampsTo30Days_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        // since=year 2000 -> mas viejo que 30d -> endpoint usa minSince
        var since = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc).ToString("o");
        var response = await client.GetAsync($"/api/mobile/notifications/?since={Uri.EscapeDataString(since)}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHistory_Unauthenticated_Returns401()
    {
        var client = ClientUnauthenticated();
        var response = await client.GetAsync("/api/mobile/notifications/");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
