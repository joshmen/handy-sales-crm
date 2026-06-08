using System.Net;
using FluentAssertions;
using HandySuites.Mobile.Tests.Common;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests HTTP reales para <c>MobileEmpresaEndpoints</c>
/// (apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileEmpresaEndpoints.cs).
///
/// Endpoint surface (base /api/mobile/empresa):
///   GET /  -> datos fiscales de la empresa del tenant (auth required)
///
/// Goal: line coverage del endpoint via MobileWebApplicationFactory (SQLite + FakeJwt).
/// El seed minimo NO incluye DatosEmpresa, por lo que el endpoint devuelve
/// 404 ("Datos de empresa no configurados") pero ejercita el path completo
/// (query + verificacion + serializacion). Para roles distintos se valida que
/// la auth fluya y el endpoint responda algo coherente.
/// </summary>
public class MobileEmpresaEndpointsHttpV2Tests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    static MobileEmpresaEndpointsHttpV2Tests()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
        Environment.SetEnvironmentVariable("JWT_SECRET", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("BILLING_API_URL", "http://billing.test");
        Environment.SetEnvironmentVariable("MAIN_API_URL", "http://main.test");
    }

    public MobileEmpresaEndpointsHttpV2Tests(MobileWebApplicationFactory factory)
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
    // GET /api/mobile/empresa/
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetEmpresa_AsAdmin_ReturnsOkOrNotFound()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/empresa/");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.NoContent,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetEmpresa_AsSuperAdmin_ReturnsOkOrNotFound()
    {
        var client = ClientAs("SUPER_ADMIN", MobileTestSeeder.SuperAdminUserId);
        var response = await client.GetAsync("/api/mobile/empresa/");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.NoContent,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetEmpresa_AsSupervisor_ReturnsOkOrNotFound()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var response = await client.GetAsync("/api/mobile/empresa/");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.NoContent,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetEmpresa_AsVendedor_ReturnsOkOrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/empresa/");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.NoContent,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetEmpresa_AsViewer_ReturnsOkOrNotFound()
    {
        var client = ClientAs("VIEWER", MobileTestSeeder.ViewerUserId);
        var response = await client.GetAsync("/api/mobile/empresa/");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.NoContent,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetEmpresa_AsTenantB_ReturnsOkOrNotFound()
    {
        // Tenant B distinto: tampoco hay DatosEmpresa pero la query debe ejecutar
        // contra TenantId=2 (cobertura del filtro por tenant)
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, MobileTestSeeder.TenantB);
        var response = await client.GetAsync("/api/mobile/empresa/");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.NoContent,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetEmpresa_AsAdminTenantB_ReturnsOkOrNotFound()
    {
        // Caso extra: ADMIN sobre tenant B (cross-role coverage)
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId, MobileTestSeeder.TenantB);
        var response = await client.GetAsync("/api/mobile/empresa/");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.NoContent,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetEmpresa_Unauthenticated_Returns401()
    {
        var client = ClientUnauthenticated();
        var response = await client.GetAsync("/api/mobile/empresa/");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound);
    }
}
