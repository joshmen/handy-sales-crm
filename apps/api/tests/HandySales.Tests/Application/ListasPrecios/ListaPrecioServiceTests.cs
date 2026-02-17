using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySales.Application.ListasPrecios.DTOs;
using HandySales.Application.ListasPrecios.Interfaces;
using HandySales.Application.ListasPrecios.Services;
using HandySales.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySales.Tests.Application.ListasPrecios
{
    public class ListaPrecioServiceTests
    {
        private readonly Mock<IListaPrecioRepository> _repoMock;
        private readonly Mock<ICurrentTenant> _tenantMock;
        private readonly ListaPrecioService _service;

        public ListaPrecioServiceTests()
        {
            _repoMock = new Mock<IListaPrecioRepository>();
            _tenantMock = new Mock<ICurrentTenant>();
            _tenantMock.Setup(t => t.TenantId).Returns(1);

            _service = new ListaPrecioService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerListasAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            var expected = new List<ListaPrecioDto>();
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(expected);

            // Act
            var result = await _service.ObtenerListasAsync();

            // Assert
            result.Should().BeSameAs(expected);
            _repoMock.Verify(r => r.ObtenerPorTenantAsync(1), Times.Once);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaRetornarElemento()
        {
            var dto = new ListaPrecioDto { Id = 1, Nombre = "General" };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(1, 1)).ReturnsAsync(dto);

            var result = await _service.ObtenerPorIdAsync(1);

            result.Should().Be(dto);
        }

        [Fact]
        public async Task CrearListaPrecioAsync_DeberiaRetornarNuevoId()
        {
            var dto = new ListaPrecioCreateDto { Nombre = "Nueva Lista" };
            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(5);

            var id = await _service.CrearListaPrecioAsync(dto);

            id.Should().Be(5);
        }

        [Fact]
        public async Task ActualizarListaPrecioAsync_DeberiaRetornarTrue()
        {
            var dto = new ListaPrecioCreateDto { Nombre = "Actualizada" };
            _repoMock.Setup(r => r.ActualizarAsync(1, dto, 1)).ReturnsAsync(true);

            var result = await _service.ActualizarListaPrecioAsync(1, dto);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task EliminarListaPrecioAsync_DeberiaRetornarTrue()
        {
            _repoMock.Setup(r => r.EliminarAsync(1, 1)).ReturnsAsync(true);

            var result = await _service.EliminarListaPrecioAsync(1);

            result.Should().BeTrue();
        }
    }
}
