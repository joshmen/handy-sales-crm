using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using HandySales.Application.Precios.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.Precios
{
    public class PrecioPorProductoEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public PrecioPorProductoEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetPrecios_DeberiaRetornarOk()
        {
            var response = await _client.GetAsync("/precios");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetPrecioPorId_NoExiste_DeberiaRetornarNotFound()
        {
            var response = await _client.GetAsync("/precios/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task PostPrecio_DeberiaRetornarCreated()
        {
            var dto = new PrecioPorProductoCreateDto
            {
                TenandId = 1,
                ProductoId = 1,
                ListaPrecioId = 1,
                Precio = 99.99m
            };

            var response = await _client.PostAsJsonAsync("/precios", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task PutPrecio_NoExiste_DeberiaRetornarNotFound()
        {
            var dto = new PrecioPorProductoCreateDto
            {
                TenandId = 1,
                ProductoId = 1,
                ListaPrecioId = 1,
                Precio = 120.00m
            };

            var response = await _client.PutAsJsonAsync("/precios/9999", dto);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeletePrecio_NoExiste_DeberiaRetornarNotFound()
        {
            var response = await _client.DeleteAsync("/precios/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
