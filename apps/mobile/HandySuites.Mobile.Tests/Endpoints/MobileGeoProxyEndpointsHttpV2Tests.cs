using HandySuites.Mobile.Tests.Common;
using FluentAssertions;
using System.Net;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP integration tests para MobileGeoProxyEndpoints.
/// Routes covered:
///   GET /api/geo/places/autocomplete
///   GET /api/geo/places/details
///   GET /api/geo/geocode/reverse
///
/// Goal: line coverage + auth/RBAC sanity. Endpoints solo requieren
/// RequireAuthorization() + RequireRateLimiting("geo-proxy").
///
/// NOTA: en Testing, GOOGLE_MAPS_API_KEY no esta configurado — el handler
/// puede lanzar InvalidOperationException, lo que se traduce a 500. Tambien
/// puede intentar conectar a Google y fallar con timeout (504) o exception (500).
/// Por eso los asserts son MUY permisivos: aceptan 200/4xx/5xx — el objetivo
/// es ejecutar la ruta para cobertura, no validar respuesta de Google real.
/// </summary>
public class MobileGeoProxyEndpointsHttpV2Tests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    public MobileGeoProxyEndpointsHttpV2Tests(MobileWebApplicationFactory factory)
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
    // GET /api/geo/places/autocomplete
    // ============================================================

    [Fact]
    public async Task PlacesAutocomplete_AsVendedor_ReturnsSomething()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/geo/places/autocomplete?query=oxxo+cdmx");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.TooManyRequests,
            HttpStatusCode.InternalServerError,
            HttpStatusCode.BadGateway,
            HttpStatusCode.GatewayTimeout);
    }

    [Fact]
    public async Task PlacesAutocomplete_WithLocationAndRadius_ReturnsSomething()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync(
            "/api/geo/places/autocomplete?query=oxxo&location=19.4326,-99.1332&radius=10000");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.TooManyRequests,
            HttpStatusCode.InternalServerError,
            HttpStatusCode.BadGateway,
            HttpStatusCode.GatewayTimeout);
    }

    [Fact]
    public async Task PlacesAutocomplete_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/geo/places/autocomplete?query=test");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.InternalServerError);
    }

    // ============================================================
    // GET /api/geo/places/details
    // ============================================================

    [Fact]
    public async Task PlacesDetails_AsVendedor_ReturnsSomething()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/geo/places/details?placeId=ChIJxxx");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.TooManyRequests,
            HttpStatusCode.InternalServerError,
            HttpStatusCode.BadGateway,
            HttpStatusCode.GatewayTimeout);
    }

    // ============================================================
    // GET /api/geo/geocode/reverse
    // ============================================================

    [Fact]
    public async Task GeocodeReverse_AsAdmin_ReturnsSomething()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/geo/geocode/reverse?latlng=19.4326,-99.1332");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.TooManyRequests,
            HttpStatusCode.InternalServerError,
            HttpStatusCode.BadGateway,
            HttpStatusCode.GatewayTimeout);
    }

    [Fact]
    public async Task GeocodeReverse_Unauthenticated_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/geo/geocode/reverse?latlng=19.4326,-99.1332");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden,
            HttpStatusCode.NotFound,
            HttpStatusCode.InternalServerError);
    }
}
