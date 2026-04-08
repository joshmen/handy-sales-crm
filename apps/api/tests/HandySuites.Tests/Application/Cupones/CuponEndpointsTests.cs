using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HandySuites.Domain.Entities;
using Xunit;

namespace HandySuites.Tests.Application.Cupones
{
    public class CuponEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public CuponEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        // ── GET /api/superadmin/cupones ──

        [Fact]
        public async Task GetCupones_RetornaListaDeCupones_CuandoEsSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var response = await _client.GetAsync("/api/superadmin/cupones");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.ValueKind.Should().Be(JsonValueKind.Array);
            result.GetArrayLength().Should().BeGreaterThanOrEqualTo(6);
        }

        [Fact]
        public async Task GetCupones_Retorna403_CuandoNoEsSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");

            var response = await _client.GetAsync("/api/superadmin/cupones");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetCupones_Retorna401_CuandoNoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");

            var response = await _client.GetAsync("/api/superadmin/cupones");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // ── POST /api/superadmin/cupones ──

        [Fact]
        public async Task PostCupon_CreaUnCuponNuevo_CuandoEsSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var dto = new
            {
                nombre = "Cupon de Prueba",
                tipo = (int)TipoCupon.MesesGratis,
                mesesGratis = 2,
                maxUsos = 50
            };

            var response = await _client.PostAsJsonAsync("/api/superadmin/cupones", dto);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.GetProperty("nombre").GetString().Should().Be("Cupon de Prueba");
            result.GetProperty("codigo").GetString().Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task PostCupon_Retorna403_CuandoNoEsSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");

            var dto = new
            {
                nombre = "Cupon Prohibido",
                tipo = (int)TipoCupon.MesesGratis,
                mesesGratis = 1
            };

            var response = await _client.PostAsJsonAsync("/api/superadmin/cupones", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        // ── PUT /api/superadmin/cupones/{id} ──

        [Fact]
        public async Task PutCupon_DesactivaCupon_CuandoEsSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var dto = new { activo = false };

            // Usa cupon id=3 (TEST-DESCUENTO-50) para no interferir con pruebas de redimir
            var response = await _client.PutAsJsonAsync("/api/superadmin/cupones/3", dto);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.GetProperty("message").GetString().Should().Contain("actualizado");
        }

        [Fact]
        public async Task PutCupon_Retorna404_CuandoCuponNoExiste()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var dto = new { activo = false };

            var response = await _client.PutAsJsonAsync("/api/superadmin/cupones/99999", dto);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        // ── POST /api/subscription/redimir-cupon ──

        [Fact]
        public async Task RedimirCupon_AplicaMesesGratis_CuandoCodigoValido()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");

            var request = new { codigo = "TEST-MESES-GRATIS" };

            var response = await _client.PostAsJsonAsync("/api/subscription/redimir-cupon", request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.GetProperty("message").GetString().Should().Contain("redimido");
            result.GetProperty("beneficio").GetString().Should().Contain("3 mes(es) gratis");
            result.GetProperty("tipo").GetString().Should().Be("MesesGratis");
        }

        [Fact]
        public async Task RedimirCupon_RechazaCuponExpirado_CuandoFechaVencida()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");

            var request = new { codigo = "TEST-EXPIRADO" };

            var response = await _client.PostAsJsonAsync("/api/subscription/redimir-cupon", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.GetProperty("message").GetString().Should().Contain("expirado");
        }

        [Fact]
        public async Task RedimirCupon_RechazaCuponAgotado_CuandoMaxUsosAlcanzado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");

            var request = new { codigo = "TEST-AGOTADO" };

            var response = await _client.PostAsJsonAsync("/api/subscription/redimir-cupon", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.GetProperty("message").GetString().Should().Contain("máximo de usos");
        }

        [Fact]
        public async Task RedimirCupon_RechazaCodigoInexistente_CuandoNoExiste()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");

            var request = new { codigo = "DOES-NOT-EXIST" };

            var response = await _client.PostAsJsonAsync("/api/subscription/redimir-cupon", request);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.GetProperty("message").GetString().Should().Contain("no encontrado");
        }

        [Fact]
        public async Task RedimirCupon_Retorna403_CuandoEsVendedor()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "VENDEDOR");

            var request = new { codigo = "TEST-MESES-GRATIS" };

            var response = await _client.PostAsJsonAsync("/api/subscription/redimir-cupon", request);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task RedimirCupon_RetornaBadRequest_CuandoCodigoVacio()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-Role", "ADMIN");

            var request = new { codigo = "" };

            var response = await _client.PostAsJsonAsync("/api/subscription/redimir-cupon", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.GetProperty("message").GetString().Should().Contain("requerido");
        }
    }
}
