using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySales.Application.Inventario.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.Inventario
{
    public class InventarioEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public InventarioEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetInventario_DeberiaRetornarOk()
        {
            var response = await _client.GetAsync("/inventario?Pagina=1&TamanoPagina=20");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetInventarioPorId_DeberiaRetornarNotFound_SiNoExiste()
        {
            var response = await _client.GetAsync("/inventario/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task PostInventario_DeberiaRetornarCreated()
        {
            var dto = new InventarioCreateDto
            {
                ProductoId = 1,
                CantidadActual = 100,
                StockMaximo = 100,
                StockMinimo = 1
            };

            var response = await _client.PostAsJsonAsync("/inventario", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task PutInventario_DeberiaRetornarNotFound_SiNoExiste()
        {
            var dto = new InventarioUpdateDto
            {
                CantidadActual = 200,
                StockMaximo = 100,
                StockMinimo = 1
            };

            var response = await _client.PutAsJsonAsync("/inventario/9999", dto);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeleteInventario_DeberiaRetornarNotFound_SiNoExiste()
        {
            var response = await _client.DeleteAsync("/inventario/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
