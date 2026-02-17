using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySales.Application.Clientes.DTOs;
using HandySales.Application.Clientes.Interfaces;
using HandySales.Application.Clientes.Services;
using HandySales.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySales.Tests.Application.Clientes
{
    public class ClienteServiceTests
    {
        private readonly Mock<IClienteRepository> _repoMock;
        private readonly Mock<ICurrentTenant> _tenantMock;
        private readonly ClienteService _service;

        public ClienteServiceTests()
        {
            _repoMock = new Mock<IClienteRepository>();
            _tenantMock = new Mock<ICurrentTenant>();
            _tenantMock.Setup(t => t.TenantId).Returns(1);

            _service = new ClienteService(_repoMock.Object, _tenantMock.Object);
        }

        [Fact]
        public async Task ObtenerClientesAsync_DeberiaRetornarListaDeClientes()
        {
            // Arrange
            var clientesEsperados = new List<ClienteDto> { new() { Id = 1, Nombre = "Juan", RFC = "RFC123456ABC", Correo = "juan@test.com", Telefono = "1234567890", Direccion = "Calle Test 123" } };
            _repoMock.Setup(r => r.ObtenerPorTenantAsync(1)).ReturnsAsync(clientesEsperados);

            // Act
            var resultado = await _service.ObtenerClientesAsync();

            // Assert
            resultado.Should().BeEquivalentTo(clientesEsperados);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_DeberiaRetornarClienteSiExiste()
        {
            var clienteEsperado = new ClienteDto { Id = 2, Nombre = "Ana", RFC = "RFC654321XYZ", Correo = "ana@test.com", Telefono = "0987654321", Direccion = "Av Test 456" };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(2, 1)).ReturnsAsync(clienteEsperado);

            var resultado = await _service.ObtenerPorIdAsync(2);

            resultado.Should().BeEquivalentTo(clienteEsperado);
        }

        [Fact]
        public async Task CrearClienteAsync_DeberiaRetornarNuevoId()
        {
            var dto = new ClienteCreateDto { Nombre = "Carlos", RFC = "RFC123456ABC", Correo = "a@a.com", Telefono = "1234567890", Direccion = "Direc", IdZona = 1, CategoriaClienteId = 1 };
            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(10);

            var id = await _service.CrearClienteAsync(dto);

            id.Should().Be(10);
        }

        [Fact]
        public async Task ActualizarClienteAsync_DeberiaRetornarTrueSiActualiza()
        {
            var dto = new ClienteCreateDto { Nombre = "Update", RFC = "RFC123456ABC", Correo = "update@a.com", Telefono = "1234567890", Direccion = "Dir", IdZona = 1, CategoriaClienteId = 1 };
            _repoMock.Setup(r => r.ActualizarAsync(3, dto, 1)).ReturnsAsync(true);

            var resultado = await _service.ActualizarClienteAsync(3, dto);

            resultado.Should().BeTrue();
        }

        [Fact]
        public async Task EliminarClienteAsync_DeberiaRetornarTrueSiElimina()
        {
            _repoMock.Setup(r => r.EliminarAsync(4, 1)).ReturnsAsync(true);

            var resultado = await _service.EliminarClienteAsync(4);

            resultado.Should().BeTrue();
        }
    }
}
