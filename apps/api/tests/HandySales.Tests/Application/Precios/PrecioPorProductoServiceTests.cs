using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySales.Application.Precios.DTOs;
using HandySales.Application.Precios.Interfaces;
using HandySales.Application.Precios.Services;
using HandySales.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySales.Tests.Application.Precios
{
    public class PrecioPorProductoServiceTests
    {
        private readonly Mock<IPrecioPorProductoRepository> _repoMock = new();
        private readonly Mock<ICurrentTenant> _tenantMock = new();
        private readonly PrecioPorProductoService _service;

        public PrecioPorProductoServiceTests()
        {
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _service = new PrecioPorProductoService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerPreciosAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
                     .ReturnsAsync(new List<PrecioPorProductoDto>());

            // Act
            var result = await _service.ObtenerPreciosAsync();

            // Assert
            result.Should().NotBeNull();
            _repoMock.Verify(r => r.ObtenerPorTenantAsync(1), Times.Once);
        }

        [Fact]
        public async Task CrearPrecioAsync_DeberiaPasarParametrosCorrectos()
        {
            var dto = new PrecioPorProductoCreateDto
            {
                TenandId = 1,
                ProductoId = 1,
                ListaPrecioId = 2,
                Precio = 50
            };

            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(123);

            var result = await _service.CrearPrecioAsync(dto);

            result.Should().Be(123);
            _repoMock.Verify(r => r.CrearAsync(dto, 1), Times.Once);
        }

        [Fact]
        public async Task EliminarPrecioAsync_DeberiaLlamarRepo()
        {
            _repoMock.Setup(r => r.EliminarAsync(5, 1)).ReturnsAsync(true);

            var result = await _service.EliminarPrecioAsync(5);

            result.Should().BeTrue();
            _repoMock.Verify(r => r.EliminarAsync(5, 1), Times.Once);
        }
    }
}
