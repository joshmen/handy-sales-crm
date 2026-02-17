using Xunit;
using Moq;
using System.Collections.Generic;
using System.Threading.Tasks;
using HandySales.Application.Descuentos.Services;
using HandySales.Application.Descuentos.DTOs;
using HandySales.Application.Descuentos.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Tests.Application.Descuentos
{
    public class DescuentoPorCantidadServiceTests
    {
        private readonly Mock<IDescuentoPorCantidadRepository> _repoMock = new();
        private readonly Mock<ICurrentTenant> _tenantMock = new();
        private readonly DescuentoPorCantidadService _service;

        public DescuentoPorCantidadServiceTests()
        {
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _service = new DescuentoPorCantidadService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerDescuentosAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(new List<DescuentoPorCantidadDto>());

            // Act
            var result = await _service.ObtenerDescuentosAsync();

            // Assert
            Assert.NotNull(result);
            _repoMock.Verify(r => r.ObtenerPorTenantAsync(1), Times.Once);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            _repoMock.Setup(r => r.ObtenerPorIdAsync(99, 1)).ReturnsAsync(new DescuentoPorCantidadDto());

            // Act
            var result = await _service.ObtenerPorIdAsync(99);

            // Assert
            Assert.NotNull(result);
            _repoMock.Verify(r => r.ObtenerPorIdAsync(99, 1), Times.Once);
        }

        [Fact]
        public async Task CrearDescuentoAsync_DeberiaPasarTenant()
        {
            var dto = new DescuentoPorCantidadCreateDto { ProductoId = 1, CantidadMinima = 5, DescuentoPorcentaje = 10, TenantId = 1, TipoAplicacion = "Test" };

            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(123);

            var id = await _service.CrearDescuentoAsync(dto);

            Assert.Equal(123, id);
            _repoMock.Verify(r => r.CrearAsync(dto, 1), Times.Once);
        }

        [Fact]
        public async Task ActualizarDescuentoAsync_DeberiaPasarTenant()
        {
            var dto = new DescuentoPorCantidadCreateDto { ProductoId = 1, CantidadMinima = 1, DescuentoPorcentaje = 5, TenantId = 1, TipoAplicacion = "Test" };

            _repoMock.Setup(r => r.ActualizarAsync(77, dto, 1)).ReturnsAsync(true);

            var result = await _service.ActualizarDescuentoAsync(77, dto);

            Assert.True(result);
            _repoMock.Verify(r => r.ActualizarAsync(77, dto, 1), Times.Once);
        }

        [Fact]
        public async Task EliminarDescuentoAsync_DeberiaPasarTenant()
        {
            _repoMock.Setup(r => r.EliminarAsync(44, 1)).ReturnsAsync(true);

            var result = await _service.EliminarDescuentoAsync(44);

            Assert.True(result);
            _repoMock.Verify(r => r.EliminarAsync(44, 1), Times.Once);
        }

        [Fact]
        public async Task ObtenerPorProductoIdAsync_DeberiaPasarTenant()
        {
            _repoMock.Setup(r => r.ObtenerPorProductoIdAsync(5, 1)).ReturnsAsync(new List<DescuentoPorCantidadDto>());

            var result = await _service.ObtenerPorProductoIdAsync(5);

            Assert.NotNull(result);
            _repoMock.Verify(r => r.ObtenerPorProductoIdAsync(5, 1), Times.Once);
        }
    }
}
