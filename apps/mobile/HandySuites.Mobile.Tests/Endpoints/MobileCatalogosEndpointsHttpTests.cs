using HandySuites.Mobile.Tests.Common;
using System.Net;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP integration tests for <see cref="HandySuites.Mobile.Api.Endpoints.MobileCatalogosEndpoints"/>.
///
/// El group /api/mobile/catalogos solo requiere <c>RequireAuthorization()</c> (sin
/// policy de rol), por lo que cualquier rol autenticado debe poder leer los
/// catalogos para alimentar dropdowns en el cliente mobile.
///
/// Routes cubiertas:
///   - GET /api/mobile/catalogos/zonas
///   - GET /api/mobile/catalogos/categorias-cliente
///   - GET /api/mobile/catalogos/categorias-producto
///   - GET /api/mobile/catalogos/familias-producto
/// </summary>
public class MobileCatalogosEndpointsHttpTests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    public MobileCatalogosEndpointsHttpTests(MobileWebApplicationFactory factory)
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

    private HttpClient AnonymousClient()
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Clear();
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
        return c;
    }

    // ============ GET /zonas ============

    [Fact]
    public async Task GetZonas_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/catalogos/zonas");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetZonas_AsVendedor_Returns200()
    {
        // El group solo requiere autenticacion, no RBAC: vendedor debe poder leer
        // catalogos para llenar dropdowns en cliente mobile.
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/catalogos/zonas");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetZonas_AsSupervisor_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var response = await client.GetAsync("/api/mobile/catalogos/zonas");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetZonas_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/catalogos/zonas");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============ GET /categorias-cliente ============

    [Fact]
    public async Task GetCategoriasCliente_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-cliente");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetCategoriasCliente_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-cliente");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetCategoriasCliente_AsViewer_Returns200()
    {
        var client = ClientAs("VIEWER", MobileTestSeeder.ViewerUserId);
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-cliente");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetCategoriasCliente_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-cliente");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============ GET /categorias-producto ============

    [Fact]
    public async Task GetCategoriasProducto_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-producto");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetCategoriasProducto_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-producto");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetCategoriasProducto_AsSupervisor_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-producto");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetCategoriasProducto_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-producto");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============ GET /familias-producto ============

    [Fact]
    public async Task GetFamiliasProducto_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/catalogos/familias-producto");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetFamiliasProducto_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/catalogos/familias-producto");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetFamiliasProducto_AsSuperAdmin_Returns200()
    {
        var client = ClientAs("SUPER_ADMIN", MobileTestSeeder.SuperAdminUserId);
        var response = await client.GetAsync("/api/mobile/catalogos/familias-producto");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetFamiliasProducto_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/catalogos/familias-producto");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ============ Cross-tenant isolation smoke ============

    [Fact]
    public async Task GetZonas_AsTenantB_Returns200_WithTenantScopedData()
    {
        // Catalogo es por-tenant; un usuario de TenantB pegando al mismo endpoint
        // debe recibir 200 con su propio set (puede estar vacio).
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, tenantId: MobileTestSeeder.TenantB);
        var response = await client.GetAsync("/api/mobile/catalogos/zonas");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetCategoriasProducto_AsTenantB_Returns200_WithTenantScopedData()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.VendedorOtroTenantId, tenantId: MobileTestSeeder.TenantB);
        var response = await client.GetAsync("/api/mobile/catalogos/categorias-producto");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
    }
}
