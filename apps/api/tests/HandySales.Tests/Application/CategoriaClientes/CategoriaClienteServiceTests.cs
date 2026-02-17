using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySales.Application.CategoriasClientes.DTOs;
using HandySales.Application.CategoriasClientes.Interfaces;
using HandySales.Application.CategoriasClientes.Services;
using HandySales.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySales.Tests.Application.CategoriasClientes
{
    public class CategoriaClienteServiceTests
    {
        private readonly Mock<ICategoriaClienteRepository> _repoMock = new();
        private readonly Mock<ICurrentTenant> _tenantMock = new();
        private readonly CategoriaClienteService _service;

        public CategoriaClienteServiceTests()
        {
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _service = new CategoriaClienteService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerCategoriasAsync_DeberiaRetornarLista()
        {
            var expected = new List<CategoriaClienteDto> { new() { Id = 1, Nombre = "A" } };
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(expected);

            var result = await _service.ObtenerCategoriasAsync();

            result.Should().BeEquivalentTo(expected);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaRetornarElemento()
        {
            var expected = new CategoriaClienteDto { Id = 2, Nombre = "B" };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(2, 1)).ReturnsAsync(expected);

            var result = await _service.ObtenerPorIdAsync(2);

            result.Should().BeEquivalentTo(expected);
        }

        [Fact]
        public async Task CrearCategoriaAsync_DeberiaRetornarId()
        {
            var dto = new CategoriaClienteCreateDto { Nombre = "Nueva" };
            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(10);

            var id = await _service.CrearCategoriaAsync(dto);

            id.Should().Be(10);
        }

        [Fact]
        public async Task ActualizarCategoriaAsync_DeberiaRetornarTrue()
        {
            var dto = new CategoriaClienteCreateDto { Nombre = "Actualizada" };
            _repoMock.Setup(r => r.ActualizarAsync(3, dto, 1)).ReturnsAsync(true);

            var result = await _service.ActualizarCategoriaAsync(3, dto);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task EliminarCategoriaAsync_DeberiaRetornarTrue()
        {
            _repoMock.Setup(r => r.EliminarAsync(4, 1)).ReturnsAsync(true);

            var result = await _service.EliminarCategoriaAsync(4);

            result.Should().BeTrue();
        }
    }
}
