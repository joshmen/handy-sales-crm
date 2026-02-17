using System.Net;
using System.Text.Json;
using FluentAssertions;
using HandySales.Application.FamiliasProductos.DTOs;
using System.Net.Http.Json;
using Xunit;

namespace HandySales.Tests.Integration.FamiliasProductos
{
    public class FamiliaProductoEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public FamiliaProductoEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetFamilias_DeberiaRetornarOK()
        {
            var response = await _client.GetAsync("/familias-productos");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task PostFamilia_DeberiaRetornarCreated()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = "Familia Test",
                Descripcion = "Descripción de prueba"
            };

            var response = await _client.PostAsJsonAsync("/familias-productos", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task GetFamiliaPorId_DeberiaRetornarOK_SiExiste()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = "Familia Consulta",
                Descripcion = "Detalle"
            };

            var post = await _client.PostAsJsonAsync("/familias-productos", dto);
            var content = await post.Content.ReadFromJsonAsync<JsonElement>();
            var id = content.GetProperty("id").GetInt32();

            var response = await _client.GetAsync($"/familias-productos/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task PutFamilia_DeberiaRetornarNoContent_SiExiste()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = "Familia Editable",
                Descripcion = "Original"
            };

            var post = await _client.PostAsJsonAsync("/familias-productos", dto);
            var content = await post.Content.ReadFromJsonAsync<JsonElement>();
            var id = content.GetProperty("id").GetInt32();

            var updateDto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = "Familia Modificada",
                Descripcion = "Editada"
            };

            var response = await _client.PutAsJsonAsync($"/familias-productos/{id}", updateDto);
            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task DeleteFamilia_DeberiaRetornarNoContent_SiExiste()
        {
            var dto = new FamiliaProductoCreateDto
            {
                TenandId = 1,
                Nombre = "Familia Eliminar",
                Descripcion = "Eliminar"
            };

            var post = await _client.PostAsJsonAsync("/familias-productos", dto);
            var content = await post.Content.ReadFromJsonAsync<JsonElement>();
            var id = content.GetProperty("id").GetInt32();

            var response = await _client.DeleteAsync($"/familias-productos/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }
}
