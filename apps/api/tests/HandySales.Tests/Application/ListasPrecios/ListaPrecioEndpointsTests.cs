using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using HandySales.Application.ListasPrecios.DTOs;
using Xunit;

namespace HandySales.Tests.Integration.ListasPrecios
{
    public class ListaPrecioEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ListaPrecioEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetListas_DeberiaRetornarOk()
        {
            var response = await _client.GetAsync("/listas-precios");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetListaPorId_DeberiaRetornarNotFound_SiNoExiste()
        {
            var response = await _client.GetAsync("/listas-precios/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task PostLista_DeberiaRetornarCreated()
        {
            var dto = new ListaPrecioCreateDto
            {
                Nombre = "Lista prueba"
            };

            var response = await _client.PostAsJsonAsync("/listas-precios", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task PutLista_DeberiaRetornarNotFound_SiNoExiste()
        {
            var dto = new ListaPrecioCreateDto
            {
                Nombre = "Actualizada"
            };

            var response = await _client.PutAsJsonAsync("/listas-precios/9999", dto);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeleteLista_DeberiaRetornarNotFound_SiNoExiste()
        {
            var response = await _client.DeleteAsync("/listas-precios/9999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
