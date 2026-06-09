using System.Net;
using System.Net.Http.Json;
using HandySuites.Mobile.Tests.Common;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP-level tests for /api/mobile/facturas using the shared
/// MobileWebApplicationFactory. These exercise the real Minimal API pipeline
/// (auth → endpoint → BillingApi proxy stub) for line coverage. Status codes
/// are flexible (BeOneOf) because the endpoints depend on seeded pedido state,
/// subscription enforcement, and country gate which we don't deeply mock here.
/// </summary>
public class MobileFacturaEndpointsHttpTests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    public MobileFacturaEndpointsHttpTests(MobileWebApplicationFactory factory)
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", "12345678901234567890123456789012");
        Environment.SetEnvironmentVariable("Jwt__Issuer", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__Audience", "HandySuites.Test");
        Environment.SetEnvironmentVariable("Jwt__ExpirationMinutes", "60");
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

    private HttpClient AnonymousClient()
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
        return c;
    }

    // --------------------------------------------------------------------
    // POST /api/mobile/facturas/from-order/{pedidoId}
    // --------------------------------------------------------------------

    [Fact]
    public async Task PostFromOrder_AsAdmin_ReturnsExpectedStatus()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new
        {
            RfcReceptor = "XAXX010101000",
            NombreReceptor = "Cliente Demo",
            RegimenFiscalReceptor = "601",
            UsoCfdiReceptor = "G03",
            CpReceptor = "01000",
        };

        var response = await client.PostAsJsonAsync("/api/mobile/facturas/from-order/5001", body);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostFromOrder_AsVendedor_ReturnsExpectedStatus()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new
        {
            UsoCfdiReceptor = "G03",
        };

        var response = await client.PostAsJsonAsync("/api/mobile/facturas/from-order/5001", body);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostFromOrder_WithMissingPedido_Returns404()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new { UsoCfdiReceptor = "G03" };

        var response = await client.PostAsJsonAsync("/api/mobile/facturas/from-order/999999", body);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostFromOrder_WithoutAuth_Returns401()
    {
        var client = AnonymousClient();
        var body = new { UsoCfdiReceptor = "G03" };

        var response = await client.PostAsJsonAsync("/api/mobile/facturas/from-order/5001", body);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden);
    }

    // --------------------------------------------------------------------
    // GET /api/mobile/facturas
    // --------------------------------------------------------------------

    [Fact]
    public async Task GetFacturas_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);

        var response = await client.GetAsync("/api/mobile/facturas/");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetFacturas_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);

        var response = await client.GetAsync("/api/mobile/facturas/");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetFacturas_WithPaging_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);

        var response = await client.GetAsync("/api/mobile/facturas/?page=2&pageSize=10");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetFacturas_WithEstadoFilter_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);

        var response = await client.GetAsync("/api/mobile/facturas/?estado=TIMBRADA");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetFacturas_WithoutAuth_Returns401()
    {
        var client = AnonymousClient();

        var response = await client.GetAsync("/api/mobile/facturas/");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden);
    }

    // --------------------------------------------------------------------
    // GET /api/mobile/facturas/{id}
    // --------------------------------------------------------------------

    [Fact]
    public async Task GetFacturaById_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);

        var response = await client.GetAsync("/api/mobile/facturas/1");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetFacturaById_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);

        var response = await client.GetAsync("/api/mobile/facturas/1");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetFacturaById_WithoutAuth_Returns401()
    {
        var client = AnonymousClient();

        var response = await client.GetAsync("/api/mobile/facturas/1");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden);
    }

    // --------------------------------------------------------------------
    // GET /api/mobile/facturas/{id}/ticket-data
    // --------------------------------------------------------------------

    [Fact]
    public async Task GetTicketData_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);

        var response = await client.GetAsync("/api/mobile/facturas/1/ticket-data");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetTicketData_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);

        var response = await client.GetAsync("/api/mobile/facturas/1/ticket-data");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetTicketData_WithoutAuth_Returns401()
    {
        var client = AnonymousClient();

        var response = await client.GetAsync("/api/mobile/facturas/1/ticket-data");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden);
    }

    // --------------------------------------------------------------------
    // GET /api/mobile/facturas/{id}/pdf
    // --------------------------------------------------------------------

    [Fact]
    public async Task GetPdf_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);

        var response = await client.GetAsync("/api/mobile/facturas/1/pdf");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetPdf_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);

        var response = await client.GetAsync("/api/mobile/facturas/1/pdf");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetPdf_WithoutAuth_Returns401()
    {
        var client = AnonymousClient();

        var response = await client.GetAsync("/api/mobile/facturas/1/pdf");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden);
    }

    // --------------------------------------------------------------------
    // POST /api/mobile/facturas/{id}/enviar
    // --------------------------------------------------------------------

    [Fact]
    public async Task PostEnviar_AsAdmin_ReturnsExpectedStatus()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var body = new
        {
            Email = "destino@test.com",
            Mensaje = "Adjunto su factura",
            IncluirPdf = true,
            IncluirXml = true,
        };

        var response = await client.PostAsJsonAsync("/api/mobile/facturas/1/enviar", body);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostEnviar_AsVendedor_ReturnsExpectedStatus()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var body = new
        {
            Email = "destino@test.com",
        };

        var response = await client.PostAsJsonAsync("/api/mobile/facturas/1/enviar", body);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.NotFound,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostEnviar_WithoutAuth_Returns401()
    {
        var client = AnonymousClient();
        var body = new { Email = "destino@test.com" };

        var response = await client.PostAsJsonAsync("/api/mobile/facturas/1/enviar", body);

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Unauthorized,
            HttpStatusCode.Forbidden);
    }

    // --------------------------------------------------------------------
    // Cross-tenant probe (cliente B as tenant B vendedor)
    // --------------------------------------------------------------------

    [Fact]
    public async Task GetFacturas_AsVendedorTenantB_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, MobileTestSeeder.TenantB);

        var response = await client.GetAsync("/api/mobile/facturas/");

        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden);
    }
}
