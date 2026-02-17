using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace HandySales.Tests.Integration.Usuarios
{
    public class UsuarioEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public UsuarioEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetUsuarios_DeberiaRetornarOK_YListaUsuarios()
        {
            // Arrange
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            // Act
            var response = await _client.GetAsync("/api/usuarios");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            content.ValueKind.Should().Be(JsonValueKind.Array);
            content.GetArrayLength().Should().BeGreaterThan(0); // El seeder tiene 4 usuarios
        }
    }
}
