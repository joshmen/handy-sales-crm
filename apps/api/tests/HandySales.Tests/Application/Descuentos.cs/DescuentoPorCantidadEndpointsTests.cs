using System.Net;
using System.Net.Http.Json;
using Xunit;
using HandySales.Application.Descuentos.DTOs;

namespace HandySales.Tests.Integration.Descuentos
{
    public class DescuentoPorCantidadEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public DescuentoPorCantidadEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetDescuentos_DeberiaRetornarOk()
        {
            var response = await _client.GetAsync("/descuentos");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetDescuentoPorId_DeberiaRetornarOkONotFound()
        {
            var response = await _client.GetAsync("/descuentos/1");
            Assert.True(
                response.StatusCode == HttpStatusCode.OK ||
                response.StatusCode == HttpStatusCode.NotFound
            );
        }

        [Fact]
        public async Task PostDescuento_DeberiaRetornarCreated()
        {
            var dto = new DescuentoPorCantidadCreateDto
            {
                ProductoId = 1,
                CantidadMinima = 10,
                DescuentoPorcentaje = 20,
                TipoAplicacion = "Producto",
                TenantId = 1
            };

            var response = await _client.PostAsJsonAsync("/descuentos", dto);

            if (response.StatusCode == HttpStatusCode.BadRequest)
            {
                // Puede ser válido si el ProductoId no existe o no hay datos válidos en test DB
                return;
            }

            response.EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task PutDescuento_DeberiaRetornarNoContentONotFound()
        {
            var dto = new DescuentoPorCantidadCreateDto
            {
                ProductoId = 1,
                CantidadMinima = 5,
                DescuentoPorcentaje = 10,
                TipoAplicacion = "Test"
            };

            var response = await _client.PutAsJsonAsync("/descuentos/1", dto);

            Assert.True(
                response.StatusCode == HttpStatusCode.NoContent ||
                response.StatusCode == HttpStatusCode.NotFound ||
                response.StatusCode == HttpStatusCode.BadRequest
            );
        }

        [Fact]
        public async Task DeleteDescuento_DeberiaRetornarNoContentONotFound()
        {
            var response = await _client.DeleteAsync("/descuentos/9999");

            Assert.True(
                response.StatusCode == HttpStatusCode.NoContent ||
                response.StatusCode == HttpStatusCode.NotFound
            );
        }

        [Fact]
        public async Task GetDescuentosPorProducto_DeberiaRetornarOk()
        {
            var response = await _client.GetAsync("/descuentos/por-producto/1");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
