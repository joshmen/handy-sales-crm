using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using HandySuites.Application.Promociones.DTOs;
using Xunit;
using System;
using System.Collections.Generic;

namespace HandySuites.Tests.Integration.Promociones
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
                ProductoIds = new List<int> { 1 },
                Descripcion = "Promocion Descripcion",
                DescuentoPorcentaje = 10,
                FechaInicio = DateTime.UtcNow,
                FechaFin = DateTime.UtcNow.AddYears(2)
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
                ProductoIds = new List<int> { 1 },
                DescuentoPorcentaje = 10,
                FechaInicio = DateTime.UtcNow,
                FechaFin = DateTime.UtcNow.AddYears(2)
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
