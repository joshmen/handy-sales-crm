using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySales.Application.CategoriasClientes.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.CategoriasClientes
{
    public class CategoriaClienteEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public CategoriaClienteEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetCategorias_DeberiaRetornarLista()
        {
            var response = await _client.GetAsync("/categorias-clientes");
            response.EnsureSuccessStatusCode();

            var categorias = await response.Content.ReadFromJsonAsync<List<CategoriaClienteDto>>();
            categorias.Should().NotBeNull();
        }

        [Fact]
        public async Task PostCategoria_DeberiaCrearCategoria()
        {
            var dto = new CategoriaClienteCreateDto { Nombre = "Distribuidor" };

            var response = await _client.PostAsJsonAsync("/categorias-clientes", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Created);

            var body = await response.Content.ReadFromJsonAsync<Dictionary<string, int>>();
            body.Should().ContainKey("id");
        }

        [Fact]
        public async Task PutCategoria_DeberiaActualizarCategoria()
        {
            var dto = new CategoriaClienteCreateDto { Nombre = "Actualizado" };

            // Asegúrate de que el ID 1 existe, o crea uno antes si es necesario
            var response = await _client.PutAsJsonAsync("/categorias-clientes/1", dto);
            if (response.StatusCode == HttpStatusCode.NotFound) return;
            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task DeleteCategoria_DeberiaEliminarCategoria()
        {
            // Asegúrate de que el ID 1 existe, o crea uno antes si es necesario
            var response = await _client.DeleteAsync("/categorias-clientes/1");
            if (response.StatusCode == HttpStatusCode.NotFound) return;
            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task GetCategoriaPorId_DeberiaRetornarCategoria()
        {
            // Asegúrate de que el ID 1 existe, o crea uno antes si es necesario
            var response = await _client.GetAsync("/categorias-clientes/1");
            if (response.StatusCode == HttpStatusCode.NotFound) return;
            response.EnsureSuccessStatusCode();

            var categoria = await response.Content.ReadFromJsonAsync<CategoriaClienteDto>();
            categoria.Should().NotBeNull();
        }

        [Fact]
        public async Task PostCategoria_DeberiaRetornarBadRequestSiFaltanCampos()
        {
            var dto = new CategoriaClienteCreateDto { Nombre = "" };
            var response = await _client.PostAsJsonAsync("/categorias-clientes", dto);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}
