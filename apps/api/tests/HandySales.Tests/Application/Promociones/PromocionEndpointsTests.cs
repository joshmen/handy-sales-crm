using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySales.Application.Promociones.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.Promociones
{
    public class PromocionEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public PromocionEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetPromociones_DeberiaRetornarOk()
        {
            var response = await _client.GetAsync("/promociones");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task PostPromocion_DeberiaRetornarCreated()
        {
            var dto = new PromocionCreateDto
            {
                Nombre = "Promo de prueba",
                ProductoId = 1,
                Descripcion = "Promocion Descripcion",
                DescuentoPorcentaje = 10,
                FechaInicio = DateTime.Now,
                FechaFin = DateTime.Now.AddYears(2),
                TenandId = 1
            };

            var response = await _client.PostAsJsonAsync("/promociones", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task PutPromocion_DeberiaRetornarNotFound_SiNoExiste()
        {
            var dto = new PromocionCreateDto
            {
                Nombre = "Actualización",
                ProductoId = 1,
                DescuentoPorcentaje = 10,
                FechaInicio = DateTime.Now,
                FechaFin = DateTime.Now.AddYears(2),
                TenandId = 1
            };

            var response = await _client.PutAsJsonAsync("/promociones/9999", dto);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeletePromocion_DeberiaRetornarNotFound_SiNoExiste()
        {
            var response = await _client.DeleteAsync("/promociones/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
