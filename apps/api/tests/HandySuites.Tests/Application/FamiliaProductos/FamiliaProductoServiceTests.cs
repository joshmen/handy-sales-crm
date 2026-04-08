using Xunit;
using Moq;
using System.Collections.Generic;
using System.Threading.Tasks;
using HandySuites.Application.FamiliasProductos.DTOs;
using HandySuites.Application.FamiliasProductos.Interfaces;
using HandySuites.Application.FamiliasProductos.Services;
using HandySuites.Shared.Multitenancy;
using FluentAssertions;

namespace HandySuites.Tests.Application.FamiliasProductos
{
    public class FamiliaProductoServiceTests
    {
        private readonly Mock<IFamiliaProductoRepository> _repoMock = new();
        private readonly Mock<ICurrentTenant> _tenantMock = new();
        private readonly FamiliaProductoService _service;

        public FamiliaProductoServiceTests()
        {
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _service = new FamiliaProductoService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerFamiliasAsync_DeberiaRetornarLista()
        {
            // Arrange
            var familias = new List<FamiliaProductoDto>
            {
                new() { Id = 1, Nombre = "Familia A", Descripcion = "Desc A" },
                new() { Id = 2, Nombre = "Familia B", Descripcion = "Desc B" }
            };
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(familias);

            // Act
            var result = await _service.ObtenerFamiliasAsync();

            // Assert
            result.Should().BeEquivalentTo(familias);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaRetornarFamilia()
        {
            var familia = new FamiliaProductoDto { Id = 1, Nombre = "Prueba", Descripcion = "Detalles" };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(1, 1)).ReturnsAsync(familia);

            var result = await _service.ObtenerPorIdAsync(1);

            result.Should().NotBeNull();
            result.Should().BeEquivalentTo(familia);
        }

        [Fact]
        public async Task CrearFamiliaAsync_DeberiaRetornarNuevoId()
        {
            var dto = new FamiliaProductoCreateDto { TenantId = 1, Nombre = "Nueva", Descripcion = "Detalle" };
            _repoMock.Setup(r => r.ExisteNombreAsync(dto.Nombre, 1, null)).ReturnsAsync(false);
            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(99);

            var result = await _service.CrearFamiliaAsync(dto);

            result.Should().Be(99);
        }

        [Fact]
        public async Task ActualizarFamiliaAsync_DeberiaRetornarTrue_SiExito()
        {
            var dto = new FamiliaProductoCreateDto { TenantId = 1, Nombre = "Editada", Descripcion = "Modificado" };
            _repoMock.Setup(r => r.ExisteNombreAsync(dto.Nombre, 1, 1)).ReturnsAsync(false);
            _repoMock.Setup(r => r.ActualizarAsync(1, dto, 1)).ReturnsAsync(true);

            var result = await _service.ActualizarFamiliaAsync(1, dto);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task EliminarFamiliaAsync_DeberiaRetornarSuccessTrue_SiExito()
        {
            _repoMock.Setup(r => r.ContarProductosPorFamiliaAsync(1, 1)).ReturnsAsync(0);
            _repoMock.Setup(r => r.EliminarAsync(1, 1)).ReturnsAsync(true);

            var result = await _service.EliminarFamiliaAsync(1);

            result.Success.Should().BeTrue();
        }
    }
}
