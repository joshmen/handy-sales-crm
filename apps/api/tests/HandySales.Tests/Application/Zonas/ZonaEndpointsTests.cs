using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using HandySales.Application.Zonas.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.Zonas
{
    public class ZonaEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ZonaEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task PostZona_DeberiaRetornarCreated()
        {
            var dto = new CreateZonaDto
            {
                Nombre = "Zona Norte",
                Descripcion = "Clientes de la zona norte"
            };

            var response = await _client.PostAsJsonAsync("/zonas", dto);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            json.TryGetProperty("id", out var idProp).Should().BeTrue();
            idProp.GetInt32().Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task GetZonas_DeberiaRetornarOK()
        {
            var response = await _client.GetAsync("/zonas");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var zonas = await response.Content.ReadFromJsonAsync<JsonElement>();
            zonas.ValueKind.Should().Be(JsonValueKind.Array);
        }

        [Fact]
        public async Task GetZonaPorId_DeberiaRetornarOK_SiExiste()
        {
            var dto = new CreateZonaDto { Nombre = "Zona Test", Descripcion = "Zona creada para test" };
            var post = await _client.PostAsJsonAsync("/zonas", dto);
            var created = await post.Content.ReadFromJsonAsync<JsonElement>();
            var id = created.GetProperty("id").GetInt32();

            var response = await _client.GetAsync($"/zonas/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            result.GetProperty("id").GetInt32().Should().Be(id);
        }

        [Fact]
        public async Task PutZona_DeberiaRetornarNoContent_SiExiste()
        {
            var dto = new CreateZonaDto { Nombre = "Zona Modificable", Descripcion = "Original", TenandId = 1 };
            var post = await _client.PostAsJsonAsync("/zonas", dto);
            var created = await post.Content.ReadFromJsonAsync<JsonElement>();
            var id = created.GetProperty("id").GetInt32();

            var update = new UpdateZonaDto { Nombre = "Zona Actualizada", Descripcion = "Modificada", Activo = true, Id = 1 };
            var response = await _client.PutAsJsonAsync($"/zonas/{id}", update);

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task DeleteZona_DeberiaRetornarNoContent_SiExiste()
        {
            var dto = new CreateZonaDto { Nombre = "Zona Eliminable", Descripcion = "Elimínala", TenandId = 1 };
            var post = await _client.PostAsJsonAsync("/zonas", dto);
            var created = await post.Content.ReadFromJsonAsync<JsonElement>();
            var id = created.GetProperty("id").GetInt32();

            var response = await _client.DeleteAsync($"/zonas/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task PutZona_DeberiaRetornarNotFound_SiNoExiste()
        {
            var dto = new UpdateZonaDto { Nombre = "Inexistente", Descripcion = "No existe", Activo = true };
            var response = await _client.PutAsJsonAsync("/zonas/9999", dto);

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
