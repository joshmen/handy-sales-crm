using System.Net;
using System.Net.Http.Json;
using HandySales.Application.CategoriasProductos.DTOs;
using Xunit;

namespace HandySales.Tests.Application.CategoriasProductos
{
    public class CategoriaProductoEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public CategoriaProductoEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetCategorias_DeberiaRetornarLista()
        {
            var response = await _client.GetAsync("/categorias-productos");
            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task PostCategoria_DeberiaCrearCategoria()
        {
            var dto = new CategoriaProductoCreateDto
            {
                Nombre = "Electrónica",
                Descripcion = "Productos electrónicos"
            };

            var response = await _client.PostAsJsonAsync("/categorias-productos", dto);
            response.EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task PutCategoria_DeberiaRetornarNotFoundSiNoExiste()
        {
            var dto = new CategoriaProductoCreateDto
            {
                Nombre = "NoExiste",
                Descripcion = "No existe"
            };

            var response = await _client.PutAsJsonAsync("/categorias-productos/9999", dto);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
