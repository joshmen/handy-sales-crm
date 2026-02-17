using Xunit;
using Moq;
using System.Collections.Generic;
using System.Threading.Tasks;
using HandySales.Application.Inventario.DTOs;
using HandySales.Application.Inventario.Interfaces;
using HandySales.Application.Inventario.Services;
using HandySales.Shared.Multitenancy;

namespace HandySales.Tests.Application.Inventario
{
    public class InventarioServiceTests
    {
        private readonly Mock<IInventarioRepository> _repoMock;
        private readonly Mock<ICurrentTenant> _tenantMock;
        private readonly InventarioService _service;

        public InventarioServiceTests()
        {
            _repoMock = new Mock<IInventarioRepository>();
            _tenantMock = new Mock<ICurrentTenant>();
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _service = new InventarioService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerInventarioAsync_DeberiaRetornarLista()
        {
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(new List<InventarioDto>());

            var result = await _service.ObtenerInventarioAsync();

            Assert.NotNull(result);
            _repoMock.Verify(r => r.ObtenerPorTenantAsync(1), Times.Once);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaLlamarRepo()
        {
            var dto = new InventarioDto();
            _repoMock.Setup(r => r.ObtenerPorIdAsync(5, 1)).ReturnsAsync(dto);

            var result = await _service.ObtenerPorIdAsync(5);

            Assert.Equal(dto, result);
            _repoMock.Verify(r => r.ObtenerPorIdAsync(5, 1), Times.Once);
        }

        [Fact]
        public async Task ObtenerPorProductoIdAsync_DeberiaLlamarRepo()
        {
            var dto = new InventarioDto();
            _repoMock.Setup(r => r.ObtenerPorProductoIdAsync(10, 1)).ReturnsAsync(dto);

            var result = await _service.ObtenerPorProductoIdAsync(10);

            Assert.Equal(dto, result);
            _repoMock.Verify(r => r.ObtenerPorProductoIdAsync(10, 1), Times.Once);
        }

        [Fact]
        public async Task CrearInventarioAsync_DeberiaRetornarId()
        {
            var dto = new InventarioCreateDto();
            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(123);

            var id = await _service.CrearInventarioAsync(dto);

            Assert.Equal(123, id);
            _repoMock.Verify(r => r.CrearAsync(dto, 1), Times.Once);
        }

        [Fact]
        public async Task ActualizarInventarioAsync_DeberiaRetornarTrue()
        {
            var dto = new InventarioUpdateDto();
            _repoMock.Setup(r => r.ActualizarAsync(99, dto, 1)).ReturnsAsync(true);

            var result = await _service.ActualizarInventarioAsync(99, dto);

            Assert.True(result);
            _repoMock.Verify(r => r.ActualizarAsync(99, dto, 1), Times.Once);
        }

        [Fact]
        public async Task EliminarInventarioAsync_DeberiaRetornarTrue()
        {
            _repoMock.Setup(r => r.EliminarAsync(77, 1)).ReturnsAsync(true);

            var result = await _service.EliminarInventarioAsync(77);

            Assert.True(result);
            _repoMock.Verify(r => r.EliminarAsync(77, 1), Times.Once);
        }
    }
}
