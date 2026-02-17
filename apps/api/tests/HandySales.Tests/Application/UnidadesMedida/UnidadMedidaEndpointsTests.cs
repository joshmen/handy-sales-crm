using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using HandySales.Application.UnidadesMedida.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HandySales.Tests.Integration.UnidadesMedida
{
    public class UnidadMedidaEndpointsTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public UnidadMedidaEndpointsTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetTodas_Unidades_DeberiaRetornarOK()
        {
            var response = await _client.GetAsync("/unidades-medida");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task PostUnidad_DeberiaRetornarCreated()
        {
            var dto = new UnidadMedidaCreateDto
            {
                Nombre = "Caja",
                Abreviatura = "CJ"
            };

            var response = await _client.PostAsJsonAsync("/unidades-medida", dto);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task GetUnidadPorId_DeberiaRetornarOK_SiExiste()
        {
            var dto = new UnidadMedidaCreateDto
            {
                Nombre = "Bolsa",
                Abreviatura = "BL"
            };

            var post = await _client.PostAsJsonAsync("/unidades-medida", dto);

            var content = await post.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            int id = doc.RootElement.GetProperty("id").GetInt32();

            var response = await _client.GetAsync($"/unidades-medida/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task PutUnidad_DeberiaRetornarNoContent_SiExiste()
        {
            var dto = new UnidadMedidaCreateDto
            {
                Nombre = "Litro",
                Abreviatura = "L"
            };

            var post = await _client.PostAsJsonAsync("/unidades-medida", dto);
            var content = await post.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            int id = doc.RootElement.GetProperty("id").GetInt32();

            var updateDto = new UnidadMedidaCreateDto
            {
                Nombre = "Litros",
                Abreviatura = "Lt"
            };

            var response = await _client.PutAsJsonAsync($"/unidades-medida/{id}", updateDto);
            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task DeleteUnidad_DeberiaRetornarNoContent_SiExiste()
        {
            var dto = new UnidadMedidaCreateDto
            {
                Nombre = "Paquete",
                Abreviatura = "PK"
            };

            var post = await _client.PostAsJsonAsync("/unidades-medida", dto);
            var content = await post.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            int id = doc.RootElement.GetProperty("id").GetInt32();

            var response = await _client.DeleteAsync($"/unidades-medida/{id}");
            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task PutUnidad_DeberiaRetornarNotFound_SiNoExiste()
        {
            var dto = new UnidadMedidaCreateDto
            {
                Nombre = "Unidad Fantasma",
                Abreviatura = "FNT"
            };

            var response = await _client.PutAsJsonAsync("/unidades-medida/9999", dto);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
