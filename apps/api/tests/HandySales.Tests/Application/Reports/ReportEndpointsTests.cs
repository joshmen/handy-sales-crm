using FluentAssertions;
using System.Net;
using System.Text.Json;
using Xunit;

namespace HandySales.Tests.Application.Reports
{
    public class ReportEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ReportEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task VentasPeriodo_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.GetAsync("/api/reports/ventas-periodo");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task VentasPeriodo_DeberiaRetornarDatos_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var desde = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd");
            var hasta = DateTime.UtcNow.ToString("yyyy-MM-dd");

            var response = await _client.GetAsync($"/api/reports/ventas-periodo?desde={desde}&hasta={hasta}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.TryGetProperty("periodos", out var periodos).Should().BeTrue();
            periodos.ValueKind.Should().Be(JsonValueKind.Array);
        }

        [Fact]
        public async Task VentasVendedor_DeberiaRetornarDatos_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var desde = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd");
            var hasta = DateTime.UtcNow.ToString("yyyy-MM-dd");

            var response = await _client.GetAsync($"/api/reports/ventas-vendedor?desde={desde}&hasta={hasta}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.TryGetProperty("vendedores", out var vendedores).Should().BeTrue();
            vendedores.ValueKind.Should().Be(JsonValueKind.Array);
        }

        [Fact]
        public async Task VentasProducto_DeberiaRetornarDatos_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var desde = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd");
            var hasta = DateTime.UtcNow.ToString("yyyy-MM-dd");

            var response = await _client.GetAsync($"/api/reports/ventas-producto?desde={desde}&hasta={hasta}&top=10");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task VentasZona_DeberiaRetornarDatos_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var desde = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd");
            var hasta = DateTime.UtcNow.ToString("yyyy-MM-dd");

            var response = await _client.GetAsync($"/api/reports/ventas-zona?desde={desde}&hasta={hasta}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task ActividadClientes_DeberiaRetornarDatos_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var desde = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd");
            var hasta = DateTime.UtcNow.ToString("yyyy-MM-dd");

            var response = await _client.GetAsync($"/api/reports/actividad-clientes?desde={desde}&hasta={hasta}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task NuevosClientes_DeberiaRetornarDatos_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var desde = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd");
            var hasta = DateTime.UtcNow.ToString("yyyy-MM-dd");

            var response = await _client.GetAsync($"/api/reports/nuevos-clientes?desde={desde}&hasta={hasta}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Inventario_DeberiaRetornarDatos_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.GetAsync("/api/reports/inventario");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Ejecutivo_DeberiaRetornarDatos_CuandoAutenticado()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            var response = await _client.GetAsync("/api/reports/ejecutivo?periodo=mes");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
