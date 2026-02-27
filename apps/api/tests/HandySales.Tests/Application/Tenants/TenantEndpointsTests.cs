using FluentAssertions;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HandySales.Tests.Application.Tenants
{
    public class TenantEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public TenantEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetTenants_DeberiaRequerir_Autenticacion()
        {
            _client.DefaultRequestHeaders.Add("X-Test-Unauthenticated", "true");
            var response = await _client.GetAsync("/api/tenants");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetTenants_DeberiaRetornarLista_ParaSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var response = await _client.GetAsync("/api/tenants");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.ValueKind.Should().Be(JsonValueKind.Array);
            result.GetArrayLength().Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task GetTenants_DeberiaRetornar403_ParaAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            // Default role is ADMIN (no X-Test-SuperAdmin)

            var response = await _client.GetAsync("/api/tenants");
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetTenantById_DeberiaRetornarDetalle_ParaSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var response = await _client.GetAsync("/api/tenants/1");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.TryGetProperty("id", out var id).Should().BeTrue();
            id.GetInt32().Should().Be(1);
        }

        [Fact]
        public async Task GetTenantById_DeberiaRetornar404_CuandoNoExiste()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var response = await _client.GetAsync("/api/tenants/99999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task CreateTenant_DeberiaCrearTenant_ParaSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var tenant = new
            {
                nombreEmpresa = "Empresa Test Sprint8",
                adminEmail = "newadmin@sprint8test.com",
                adminPassword = "Test123!",
                adminNombre = "Admin Sprint8"
            };

            var response = await _client.PostAsJsonAsync("/api/tenants", tenant);
            response.StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.OK);
        }

        [Fact]
        public async Task CreateTenant_DeberiaRetornar403_ParaAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            var tenant = new
            {
                nombreEmpresa = "Empresa Forbidden",
                adminEmail = "admin@forbidden.com",
                adminPassword = "Test123!",
                adminNombre = "Admin"
            };

            var response = await _client.PostAsJsonAsync("/api/tenants", tenant);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetTenantUsers_DeberiaRetornarUsuarios_ParaSuperAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");
            _client.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");

            var response = await _client.GetAsync("/api/tenants/1/users");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);
            result.ValueKind.Should().Be(JsonValueKind.Array);
            result.GetArrayLength().Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task ToggleTenantActivo_DeberiaRetornar403_ParaAdmin()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            var body = new { activo = false };
            var response = await _client.PatchAsJsonAsync("/api/tenants/2/activo", body);
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }
}
