using System.Net;
using FluentAssertions;
using HandySuites.Mobile.Tests.Common;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests HTTP reales para <c>MobileMetasEndpoints</c>
/// (apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileMetasEndpoints.cs).
///
/// Endpoint surface (base /api/mobile/metas):
///   GET /  -> metas activas del vendedor con progreso (auth required)
///
/// Goal: line coverage del endpoint via MobileWebApplicationFactory (SQLite + FakeJwt).
/// El seed minimo no incluye MetasVendedor, por lo que el endpoint devuelve
/// una lista vacia pero ejercita el path completo (query + serializacion).
/// </summary>
public class MobileMetasEndpointsHttpV2Tests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    static MobileMetasEndpointsHttpV2Tests()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
        Environment.SetEnvironmentVariable("JWT_SECRET", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("BILLING_API_URL", "http://billing.test");
        Environment.SetEnvironmentVariable("MAIN_API_URL", "http://main.test");
    }

    public MobileMetasEndpointsHttpV2Tests(MobileWebApplicationFactory factory)
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
    // GET /api/mobile/metas/
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetMetas_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/metas/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetMetas_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/metas/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetMetas_AsSuperAdmin_Returns200()
    {
        var client = ClientAs("SUPER_ADMIN", MobileTestSeeder.SuperAdminUserId);
        var response = await client.GetAsync("/api/mobile/metas/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetMetas_AsSupervisor_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var response = await client.GetAsync("/api/mobile/metas/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetMetas_AsViewer_Returns200()
    {
        var client = ClientAs("VIEWER", MobileTestSeeder.ViewerUserId);
        var response = await client.GetAsync("/api/mobile/metas/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetMetas_AsVendedor2_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor2Id);
        var response = await client.GetAsync("/api/mobile/metas/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetMetas_AsVendedorOtherTenant_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, MobileTestSeeder.TenantB);
        var response = await client.GetAsync("/api/mobile/metas/");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetMetas_Unauthenticated_Returns401()
    {
        var client = ClientUnauthenticated();
        var response = await client.GetAsync("/api/mobile/metas/");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
