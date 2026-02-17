using System.Collections.Generic;
using System.Threading.Tasks;
using HandySales.Application.UnidadesMedida.DTOs;
using HandySales.Application.UnidadesMedida.Interfaces;
using HandySales.Application.UnidadesMedida.Services;
using HandySales.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySales.Tests.Application.UnidadesMedida
{
    public class UnidadMedidaServiceTests
    {
        private readonly Mock<IUnidadMedidaRepository> _repoMock;
        private readonly Mock<ICurrentTenant> _tenantMock;
        private readonly UnidadMedidaService _service;

        public UnidadMedidaServiceTests()
        {
            _repoMock = new Mock<IUnidadMedidaRepository>();
            _tenantMock = new Mock<ICurrentTenant>();
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _service = new UnidadMedidaService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerUnidadesAsync_DeberiaLlamarRepositorio()
        {
            // Arrange
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(new List<UnidadMedidaDto>());

            // Act
            var result = await _service.ObtenerUnidadesAsync();

            // Assert
            _repoMock.Verify(r => r.ObtenerPorTenantAsync(1), Times.Once);
        }

        [Fact]
        public async Task CrearUnidadAsync_DeberiaLlamarRepositorio()
        {
            var dto = new UnidadMedidaCreateDto { Nombre = "Pieza", TenandId = 1, Abreviatura = "PZ" };

            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(1);

            var id = await _service.CrearUnidadAsync(dto);

            _repoMock.Verify(r => r.CrearAsync(dto, 1), Times.Once);
            Assert.Equal(1, id);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaLlamarRepositorio()
        {
            _repoMock.Setup(r => r.ObtenerPorIdAsync(5, 1)).ReturnsAsync((UnidadMedidaDto?)null);

            var result = await _service.ObtenerPorIdAsync(5);

            _repoMock.Verify(r => r.ObtenerPorIdAsync(5, 1), Times.Once);
            Assert.Null(result);
        }

        [Fact]
        public async Task ActualizarUnidadAsync_DeberiaLlamarRepositorio()
        {
            var dto = new UnidadMedidaCreateDto { Nombre = "Caja", TenandId = 1, Abreviatura = "CJ" };

            _repoMock.Setup(r => r.ActualizarAsync(5, dto, 1)).ReturnsAsync(true);

            var result = await _service.ActualizarUnidadAsync(5, dto);

            _repoMock.Verify(r => r.ActualizarAsync(5, dto, 1), Times.Once);
            Assert.True(result);
        }

        [Fact]
        public async Task EliminarUnidadAsync_DeberiaLlamarRepositorio()
        {
            _repoMock.Setup(r => r.EliminarAsync(3, 1)).ReturnsAsync(true);

            var result = await _service.EliminarUnidadAsync(3);

            _repoMock.Verify(r => r.EliminarAsync(3, 1), Times.Once);
            Assert.True(result);
        }
    }
}
