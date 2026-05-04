using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace HandySuites.Tests.Integration.Usuarios
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

        /// <summary>
        /// Regression: admin web Equipo manda {nombre, rol, activo, telefono} SIN
        /// email al PUT /api/usuarios/{id}. Antes el DTO requería Email
        /// (NotEmpty) y caía con 400. Reportado 2026-05-04 por owner.
        /// </summary>
        [Fact]
        public async Task UpdateUsuario_SinEmail_DeberiaRetornar200_NoBadRequest()
        {
            _client.DefaultRequestHeaders.Add("Authorization", "Bearer fake-jwt-token");

            // Listamos primero para conseguir un id válido del seeder.
            var listResp = await _client.GetAsync("/api/usuarios");
            listResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await listResp.Content.ReadFromJsonAsync<JsonElement>();
            var firstId = list[0].GetProperty("id").GetInt32();

            // Payload exactamente como lo manda apps/web/.../MiembrosTab.tsx —
            // sin email. Se espera 200 con la lógica patch nueva.
            var payload = new
            {
                nombre = "Vendedor Updated Test",
                rol = "VENDEDOR",
                activo = true,
                telefono = "+52 55 1234-5678",
            };

            var resp = await _client.PutAsJsonAsync($"/api/usuarios/{firstId}", payload);

            resp.StatusCode.Should().Be(HttpStatusCode.OK,
                because: "PUT con {nombre,rol,activo,telefono} sin email NO debe ser 400");
        }
    }
}
