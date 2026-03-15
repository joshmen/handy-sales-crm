using Xunit;
using Moq;
using FluentAssertions;
using HandySales.Application.Zonas.DTOs;
using HandySales.Application.Zonas.Interfaces;
using HandySales.Application.Zonas.Services;
using HandySales.Shared.Multitenancy;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HandySales.Tests.Application.Zonas
{
    public class ZonaServiceTests
    {
        private readonly Mock<IZonaRepository> _repoMock = new();
        private readonly Mock<ICurrentTenant> _tenantMock = new();
        private readonly ZonaService _service;

        public ZonaServiceTests()
        {
            _tenantMock.Setup(x => x.TenantId).Returns(1);
            _service = new ZonaService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerZonasAsync_DeberiaRetornarLista()
        {
            // Arrange
            var zonas = new List<ZonaDto> { new() { Id = 1, Nombre = "Norte", Activo = true, Descripcion = "Descripcion", TenantId = 1 } };
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(zonas);

            // Act
            var result = await _service.ObtenerZonasAsync();

            // Assert
            result.Should().HaveCount(1);
            result[0].Nombre.Should().Be("Norte");
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaRetornarZona()
        {
            var zona = new ZonaDto { Id = 1, Nombre = "Centro", Activo = true, Descripcion = "Descripcion", TenantId = 1 };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(1, 1)).ReturnsAsync(zona);

            var result = await _service.ObtenerPorIdAsync(1);

            result.Should().NotBeNull();
            result!.Nombre.Should().Be("Centro");
        }

        [Fact]
        public async Task CrearZonaAsync_DeberiaRetornarNuevoId()
        {
            var dto = new CreateZonaDto { Nombre = "Sur", Descripcion = "Zona sur", TenandId = 1 };
            _repoMock.Setup(r => r.CrearAsync(dto, "admin", 1)).ReturnsAsync(10);
            _repoMock.Setup(r => r.ObtenerZonasConCoordenadasAsync(1, null)).ReturnsAsync(new List<(int, string, double, double, double)>());

            var result = await _service.CrearZonaAsync(dto, "admin");

            result.Success.Should().BeTrue();
            result.Id.Should().Be(10);
        }

        [Fact]
        public async Task ActualizarZonaAsync_DeberiaRetornarTrue()
        {
            var dto = new UpdateZonaDto { Id = 1, Nombre = "Modificada", Descripcion = "Nueva", Activo = true };
            _repoMock.Setup(r => r.ActualizarAsync(1, dto, "admin", 1)).ReturnsAsync(true);
            _repoMock.Setup(r => r.ObtenerZonasConCoordenadasAsync(1, 1)).ReturnsAsync(new List<(int, string, double, double, double)>());

            var result = await _service.ActualizarZonaAsync(1, dto, "admin");

            result.Success.Should().BeTrue();
        }

        [Fact]
        public async Task EliminarZonaAsync_DeberiaRetornarSuccessTrue()
        {
            _repoMock.Setup(r => r.ContarClientesPorZonaAsync(1, 1)).ReturnsAsync(0);
            _repoMock.Setup(r => r.EliminarAsync(1, 1)).ReturnsAsync(true);

            var result = await _service.EliminarZonaAsync(1);

            result.Success.Should().BeTrue();
        }
    }
}
