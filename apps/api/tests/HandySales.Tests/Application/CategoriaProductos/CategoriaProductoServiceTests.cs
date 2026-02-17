using Xunit;
using Moq;
using System.Threading.Tasks;
using System.Collections.Generic;
using HandySales.Application.CategoriasProductos.DTOs;
using HandySales.Application.CategoriasProductos.Interfaces;
using HandySales.Application.CategoriasProductos.Services;
using HandySales.Shared.Multitenancy;

namespace HandySales.Tests.Application.CategoriasProductos
{
    public class CategoriaProductoServiceTests
    {
        private readonly Mock<ICategoriaProductoRepository> _repoMock = new();
        private readonly Mock<ICurrentTenant> _tenantMock = new();
        private readonly CategoriaProductoService _service;

        public CategoriaProductoServiceTests()
        {
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _service = new CategoriaProductoService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerCategoriasAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            var esperado = new List<CategoriaProductoDto> { new() { Nombre = "Cat1" } };
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(esperado);

            // Act
            var resultado = await _service.ObtenerCategoriasAsync();

            // Assert
            Assert.Equal(esperado, resultado);
            _repoMock.Verify(r => r.ObtenerPorTenantAsync(1), Times.Once);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            var esperado = new CategoriaProductoDto { Nombre = "Cat1" };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(5, 1)).ReturnsAsync(esperado);

            // Act
            var resultado = await _service.ObtenerPorIdAsync(5);

            // Assert
            Assert.Equal(esperado, resultado);
            _repoMock.Verify(r => r.ObtenerPorIdAsync(5, 1), Times.Once);
        }

        [Fact]
        public async Task CrearCategoriaAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            var dto = new CategoriaProductoCreateDto { Nombre = "Nueva" };
            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(10);

            // Act
            var id = await _service.CrearCategoriaAsync(dto);

            // Assert
            Assert.Equal(10, id);
            _repoMock.Verify(r => r.CrearAsync(dto, 1), Times.Once);
        }

        [Fact]
        public async Task ActualizarCategoriaAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            var dto = new CategoriaProductoCreateDto { Nombre = "Actualizada" };
            _repoMock.Setup(r => r.ActualizarAsync(2, dto, 1)).ReturnsAsync(true);

            // Act
            var resultado = await _service.ActualizarCategoriaAsync(2, dto);

            // Assert
            Assert.True(resultado);
            _repoMock.Verify(r => r.ActualizarAsync(2, dto, 1), Times.Once);
        }

        [Fact]
        public async Task EliminarCategoriaAsync_DeberiaLlamarRepositorioConTenant()
        {
            // Arrange
            _repoMock.Setup(r => r.EliminarAsync(3, 1)).ReturnsAsync(true);

            // Act
            var resultado = await _service.EliminarCategoriaAsync(3);

            // Assert
            Assert.True(resultado);
            _repoMock.Verify(r => r.EliminarAsync(3, 1), Times.Once);
        }
    }
}
