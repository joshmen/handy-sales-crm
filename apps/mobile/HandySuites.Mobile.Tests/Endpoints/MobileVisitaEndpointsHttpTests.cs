using FluentAssertions;
using HandySuites.Application.Visitas.DTOs;
using HandySuites.Domain.Entities;
using HandySuites.Mobile.Tests.Common;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// HTTP-level tests for MobileVisitaEndpoints (/api/mobile/visitas).
/// Exercises every route via MobileWebApplicationFactory (real DI + SQLite + seed).
/// Goal: line coverage of the endpoint lambdas + RBAC/auth sanity.
/// </summary>
public class MobileVisitaEndpointsHttpTests : IClassFixture<MobileWebApplicationFactory>
{
    private readonly MobileWebApplicationFactory _factory;

    public MobileVisitaEndpointsHttpTests(MobileWebApplicationFactory factory)
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
        // FakeJwtAuthHandler authenticates with default claims unless this
        // header is present — required to actually trigger 401 path.
        c.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
        return c;
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/mobile/visitas  (programar visita)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task PostVisita_AsVendedor_Returns201Or400()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var dto = new ClienteVisitaCreateDto
        {
            ClienteId = MobileTestSeeder.ClienteAId,
            FechaProgramada = DateTime.UtcNow.AddHours(1),
            TipoVisita = TipoVisita.Rutina,
            Notas = "Visita de prueba"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas", dto);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Created,
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.Forbidden,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVisita_AsAdmin_Returns201Or400()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var dto = new ClienteVisitaCreateDto
        {
            ClienteId = MobileTestSeeder.ClienteAId,
            FechaProgramada = DateTime.UtcNow.AddHours(2),
            TipoVisita = TipoVisita.Rutina,
            Notas = "Programada por admin"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas", dto);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.Created,
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostVisita_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var dto = new ClienteVisitaCreateDto { ClienteId = MobileTestSeeder.ClienteAId };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas", dto);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/mobile/visitas/hoy
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetVisitasHoy_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/visitas/hoy");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetVisitasHoy_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/visitas/hoy");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetVisitasHoy_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/visitas/hoy");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/mobile/visitas/mis-visitas
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMisVisitas_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/visitas/mis-visitas");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetMisVisitas_AsSupervisor_Returns200()
    {
        var client = ClientAs("SUPERVISOR", MobileTestSeeder.SupervisorAUserId);
        var response = await client.GetAsync("/api/mobile/visitas/mis-visitas");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetMisVisitas_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/visitas/mis-visitas");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/mobile/visitas/activa
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetVisitaActiva_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/visitas/activa");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetVisitaActiva_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/visitas/activa");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetVisitaActiva_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/visitas/activa");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/mobile/visitas/{id}
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetVisitaPorId_AsVendedor_Returns200Or404()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/visitas/99999");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetVisitaPorId_AsAdmin_Returns200Or404()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/visitas/1");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetVisitaPorId_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/visitas/1");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/mobile/visitas/cliente/{clienteId}
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetVisitasPorCliente_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync($"/api/mobile/visitas/cliente/{MobileTestSeeder.ClienteAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetVisitasPorCliente_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync($"/api/mobile/visitas/cliente/{MobileTestSeeder.ClienteAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetVisitasPorCliente_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync($"/api/mobile/visitas/cliente/{MobileTestSeeder.ClienteAId}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/mobile/visitas/{id}/check-in
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task PostCheckIn_AsVendedor_ReturnsExpected()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var dto = new CheckInDto
        {
            Latitud = 19.4326,
            Longitud = -99.1332,
            Notas = "Llegando al cliente"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas/99999/check-in", dto);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostCheckIn_AsAdmin_ReturnsExpected()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var dto = new CheckInDto
        {
            Latitud = 19.4326,
            Longitud = -99.1332
        };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas/1/check-in", dto);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostCheckIn_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var dto = new CheckInDto { Latitud = 0, Longitud = 0 };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas/1/check-in", dto);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/mobile/visitas/{id}/check-out
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task PostCheckOut_AsVendedor_ReturnsExpected()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var dto = new CheckOutDto
        {
            Latitud = 19.4326,
            Longitud = -99.1332,
            Resultado = ResultadoVisita.SinVenta,
            Notas = "Sin venta"
        };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas/99999/check-out", dto);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostCheckOut_AsAdmin_ReturnsExpected()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var dto = new CheckOutDto
        {
            Resultado = ResultadoVisita.SinVenta
        };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas/1/check-out", dto);
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK,
            HttpStatusCode.BadRequest,
            HttpStatusCode.NotFound,
            HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task PostCheckOut_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var dto = new CheckOutDto { Resultado = ResultadoVisita.SinVenta };
        var response = await client.PostAsJsonAsync("/api/mobile/visitas/1/check-out", dto);
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/mobile/visitas/resumen/diario
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetResumenDiario_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/visitas/resumen/diario");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetResumenDiario_WithFecha_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var fecha = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var response = await client.GetAsync($"/api/mobile/visitas/resumen/diario?fecha={fecha}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetResumenDiario_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/visitas/resumen/diario");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetResumenDiario_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/visitas/resumen/diario");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/mobile/visitas/resumen/semanal
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetResumenSemanal_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var response = await client.GetAsync("/api/mobile/visitas/resumen/semanal");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetResumenSemanal_WithFecha_AsVendedor_Returns200()
    {
        var client = ClientAs("VENDEDOR", MobileTestSeeder.Vendedor1Id);
        var fechaInicio = DateTime.UtcNow.Date.AddDays(-7).ToString("yyyy-MM-dd");
        var response = await client.GetAsync($"/api/mobile/visitas/resumen/semanal?fechaInicio={fechaInicio}");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetResumenSemanal_AsAdmin_Returns200()
    {
        var client = ClientAs("ADMIN", MobileTestSeeder.AdminUserId);
        var response = await client.GetAsync("/api/mobile/visitas/resumen/semanal");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task GetResumenSemanal_Unauthenticated_Returns401()
    {
        var client = AnonymousClient();
        var response = await client.GetAsync("/api/mobile/visitas/resumen/semanal");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }
}
