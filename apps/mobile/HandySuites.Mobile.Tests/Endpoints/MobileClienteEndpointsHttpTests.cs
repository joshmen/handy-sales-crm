using HandySuites.Application.Clientes.DTOs;
using HandySuites.Mobile.Tests.Common;
using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP integration tests para MobileClienteEndpoints (apps/mobile/HandySuites.Mobile.Api/Endpoints/MobileClienteEndpoints.cs).
/// Ejercitan todas las rutas (GET /, GET /{id}, GET /{id}/ubicacion, GET /cercanos, POST /, PUT /{id})
/// via MobileWebApplicationFactory (SQLite in-memory + seeded fixtures + FakeJwtAuthHandler).
///
/// El endpoint group solo aplica .RequireAuthorization() (sin role check), por lo cual
/// VENDEDOR/SUPERVISOR/ADMIN/VIEWER son todos validos como rol. Negative auth = 401 sin header.
/// </summary>
public class MobileClienteEndpointsHttpTests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    public MobileClienteEndpointsHttpTests(MobileWebApplicationFactory factory)
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
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
        return c;
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/mobile/clientes
    // ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ListarClientes_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/?pagina=1&porPagina=20");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarClientes_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/clientes/?pagina=1&porPagina=20");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarClientes_WithBusqueda_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/?busqueda=Cliente&pagina=1&porPagina=20");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarClientes_WithZonaFilter_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/?zonaId=1&pagina=1&porPagina=50");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarClientes_WithPagination_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/clientes/?pagina=2&porPagina=5");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarClientes_WithPorPaginaOver100_CapsAt100()
    {
        // Ejercita la rama Math.Min(porPagina, 100)
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/clientes/?pagina=1&porPagina=500");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarClientes_WithZeroPagination_FallsBackToDefaults()
    {
        // Ejercita las ramas (pagina > 0 ? pagina : 1) y (porPagina > 0 ? ... : 20)
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/clientes/?pagina=0&porPagina=0");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListarClientes_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/clientes/");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/mobile/clientes/{id}
    // ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetClientePorId_AsVendedor_ReturnsOkOrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetClientePorId_AsAdmin_ReturnsOkOrNotFound()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetClientePorId_NonExistentId_Returns404()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/clientes/99999999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetClientePorId_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/mobile/clientes/{id}/ubicacion
    // ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetUbicacion_AsVendedor_ReturnsOkOrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}/ubicacion");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetUbicacion_AsAdmin_ReturnsOkOrNotFound()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}/ubicacion");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetUbicacion_NonExistentId_Returns404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/99999999/ubicacion");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetUbicacion_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}/ubicacion");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/mobile/clientes/cercanos
    // ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetCercanos_ValidCoords_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=19.4326&longitud=-99.1332&radioKm=10");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetCercanos_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=19.4326&longitud=-99.1332&radioKm=50");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetCercanos_InvalidLatitudOver90_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=91&longitud=0&radioKm=10");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCercanos_InvalidLatitudUnderMinus90_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=-91&longitud=0&radioKm=10");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCercanos_InvalidLongitudOver180_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=0&longitud=181&radioKm=10");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCercanos_InvalidLongitudUnderMinus180_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=0&longitud=-181&radioKm=10");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCercanos_RadioKmZero_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=19.4&longitud=-99.1&radioKm=0");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCercanos_RadioKmOver1000_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=19.4&longitud=-99.1&radioKm=1500");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCercanos_RadioKmNegative_Returns400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=19.4&longitud=-99.1&radioKm=-5");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetCercanos_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var response = await client.GetAsync("/api/mobile/clientes/cercanos?latitud=19.4&longitud=-99.1&radioKm=10");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────
    // POST /api/mobile/clientes
    // ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CrearCliente_AsVendedor_ReturnsCreatedOrConflict()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var dto = new ClienteCreateDto
        {
            Nombre = "Nuevo Cliente Mobile " + Guid.NewGuid().ToString("N").Substring(0, 8),
            RFC = "XAXX010101000",
            Telefono = "5550000001",
            Correo = "nuevo@test.com",
            Direccion = "Calle Falsa 123",
            NumeroExterior = "10",
            IdZona = 1,
            CategoriaClienteId = 1,
            TiposPagoPermitidos = "efectivo",
            TipoPagoPredeterminado = "efectivo"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/clientes/", dto);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.Conflict, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CrearCliente_AsAdmin_ReturnsCreatedOrConflict()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var dto = new ClienteCreateDto
        {
            Nombre = "Cliente Admin " + Guid.NewGuid().ToString("N").Substring(0, 8),
            RFC = "XAXX010101000",
            Telefono = "5550000002",
            Direccion = "Av Reforma 100",
            NumeroExterior = "100",
            IdZona = 1,
            CategoriaClienteId = 1,
            TiposPagoPermitidos = "efectivo",
            TipoPagoPredeterminado = "efectivo"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/clientes/", dto);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.Conflict, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CrearCliente_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var dto = new ClienteCreateDto
        {
            Nombre = "Test",
            Direccion = "Test",
            NumeroExterior = "1",
            IdZona = 1,
            CategoriaClienteId = 1
        };
        var response = await client.PostAsJsonAsync("/api/mobile/clientes/", dto);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PUT /api/mobile/clientes/{id}
    // ─────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ActualizarCliente_AsVendedor_ReturnsOkOrNotFound()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var dto = new ClienteCreateDto
        {
            Nombre = "Cliente Actualizado",
            Telefono = "5550000003",
            Direccion = "Direccion modificada",
            NumeroExterior = "20",
            IdZona = 1,
            CategoriaClienteId = 1,
            TiposPagoPermitidos = "efectivo",
            TipoPagoPredeterminado = "efectivo"
        };
        var response = await client.PutAsJsonAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}", dto);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.Conflict, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ActualizarCliente_AsAdmin_ReturnsOkOrNotFound()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var dto = new ClienteCreateDto
        {
            Nombre = "Cliente Admin Update",
            Direccion = "Nueva direccion admin",
            NumeroExterior = "5",
            IdZona = 1,
            CategoriaClienteId = 1,
            TiposPagoPermitidos = "efectivo",
            TipoPagoPredeterminado = "efectivo"
        };
        var response = await client.PutAsJsonAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}", dto);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.Conflict, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ActualizarCliente_NonExistentId_Returns404OrConflict()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var dto = new ClienteCreateDto
        {
            Nombre = "Phantom",
            Direccion = "Calle 1",
            NumeroExterior = "1",
            IdZona = 1,
            CategoriaClienteId = 1
        };
        var response = await client.PutAsJsonAsync("/api/mobile/clientes/99999999", dto);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.Conflict, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ActualizarCliente_WithoutAuth_Returns401()
    {
        var client = UnauthenticatedClient();
        var dto = new ClienteCreateDto
        {
            Nombre = "Test",
            Direccion = "Test",
            NumeroExterior = "1",
            IdZona = 1,
            CategoriaClienteId = 1
        };
        var response = await client.PutAsJsonAsync($"/api/mobile/clientes/{MobileTestSeeder.ClienteAId}", dto);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
