using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.Clientes.DTOs;
using HandySuites.Application.Clientes.Interfaces;
using HandySuites.Application.Clientes.Services;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Clientes
{
    public class ClienteServiceTests
    {
        private readonly Mock<IClienteRepository> _repoMock;
        private readonly Mock<ICurrentTenant> _tenantMock;
        private readonly Mock<IUsuarioRepository> _usuarioRepoMock;
        private readonly ClienteService _service;

        public ClienteServiceTests()
        {
            _repoMock = new Mock<IClienteRepository>();
            _tenantMock = new Mock<ICurrentTenant>();
            _usuarioRepoMock = new Mock<IUsuarioRepository>();
            _tenantMock.Setup(t => t.TenantId).Returns(1);
            _tenantMock.Setup(t => t.IsAdmin).Returns(true);
            // Default: FKs del tenant existen para Crear/Actualizar happy paths.
            _repoMock.Setup(r => r.ExisteZonaEnTenantAsync(It.IsAny<int>(), It.IsAny<int>())).ReturnsAsync(true);
            _repoMock.Setup(r => r.ExisteCategoriaEnTenantAsync(It.IsAny<int>(), It.IsAny<int>())).ReturnsAsync(true);
            _repoMock.Setup(r => r.ExisteListaPreciosEnTenantAsync(It.IsAny<int>(), It.IsAny<int>())).ReturnsAsync(true);

            _service = new ClienteService(_repoMock.Object, _tenantMock.Object, _usuarioRepoMock.Object);
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
        public async Task CrearClienteAsync_DeberiaRetornarSuccessConId()
        {
            var dto = new ClienteCreateDto { Nombre = "Carlos", RFC = "RFC123456ABC", Correo = "a@a.com", Telefono = "1234567890", Direccion = "Direc", NumeroExterior = "10", IdZona = 1, CategoriaClienteId = 1 };
            _repoMock.Setup(r => r.ExisteNombreEnTenantAsync(dto.Nombre, 1, null)).ReturnsAsync(false);
            _repoMock.Setup(r => r.CrearAsync(dto, 1)).ReturnsAsync(10);

            var result = await _service.CrearClienteAsync(dto);

            result.Success.Should().BeTrue();
            result.Id.Should().Be(10);
        }

        [Fact]
        public async Task ActualizarClienteAsync_DeberiaRetornarSuccessTrueSiActualiza()
        {
            var dto = new ClienteCreateDto { Nombre = "Update", RFC = "RFC123456ABC", Correo = "update@a.com", Telefono = "1234567890", Direccion = "Dir", NumeroExterior = "20", IdZona = 1, CategoriaClienteId = 1 };
            _repoMock.Setup(r => r.ExisteNombreEnTenantAsync(dto.Nombre, 1, 3)).ReturnsAsync(false);
            _repoMock.Setup(r => r.ActualizarAsync(3, dto, 1)).ReturnsAsync(true);

            var resultado = await _service.ActualizarClienteAsync(3, dto);

            resultado.Success.Should().BeTrue();
        }

        [Fact]
        public async Task EliminarClienteAsync_DeberiaRetornarSuccessSiNoHayPedidosActivos()
        {
            _repoMock.Setup(r => r.ContarPedidosActivosAsync(4, 1)).ReturnsAsync(0);
            _repoMock.Setup(r => r.EliminarAsync(4, 1)).ReturnsAsync(true);

            var resultado = await _service.EliminarClienteAsync(4);

            resultado.Success.Should().BeTrue();
            resultado.PedidosActivos.Should().Be(0);
        }

        [Fact]
        public async Task EliminarClienteAsync_DeberiaRechazarSiHayPedidosActivos()
        {
            _repoMock.Setup(r => r.ContarPedidosActivosAsync(4, 1)).ReturnsAsync(3);

            var resultado = await _service.EliminarClienteAsync(4);

            resultado.Success.Should().BeFalse();
            resultado.PedidosActivos.Should().Be(3);
            resultado.Error.Should().Contain("3 pedido");
            _repoMock.Verify(r => r.EliminarAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task EliminarClienteAsync_DeberiaEliminarSiForzarTrueConPedidosActivos()
        {
            _repoMock.Setup(r => r.EliminarAsync(4, 1)).ReturnsAsync(true);

            var resultado = await _service.EliminarClienteAsync(4, forzar: true);

            resultado.Success.Should().BeTrue();
            _repoMock.Verify(r => r.ContarPedidosActivosAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
            _repoMock.Verify(r => r.EliminarAsync(4, 1), Times.Once);
        }
    }
}
