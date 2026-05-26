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

        // ─── RBAC en ObtenerPorIdAsync (audit H-1 — documenta el contract IDOR-safe) ───
        // El listado paginado SÍ filtra por VendedorId (matriz role-based), pero el GET
        // por id antes no — vendedor1 leía clientes de vendedor2. Fixed via service.
        // Estos tests previenen regresiones si alguien remueve el RBAC del service.

        [Fact]
        public async Task ObtenerPorIdAsync_VendedorRegular_NoVeClienteDeOtroVendedor()
        {
            // Vendedor con id=5 intenta leer cliente asignado a vendedor id=99
            _tenantMock.Setup(t => t.IsAdmin).Returns(false);
            _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
            _tenantMock.Setup(t => t.IsSupervisor).Returns(false);
            _tenantMock.Setup(t => t.UserId).Returns("5");
            var clienteDeOtro = new ClienteDto { Id = 10, Nombre = "X", RFC = "R", Correo = "x@x.com", Telefono = "1", Direccion = "D", VendedorId = 99 };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync(clienteDeOtro);

            var resultado = await _service.ObtenerPorIdAsync(10);

            resultado.Should().BeNull("vendedor regular solo debe ver clientes asignados a él");
        }

        [Fact]
        public async Task ObtenerPorIdAsync_VendedorRegular_VeClienteAsignadoAEl()
        {
            _tenantMock.Setup(t => t.IsAdmin).Returns(false);
            _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
            _tenantMock.Setup(t => t.IsSupervisor).Returns(false);
            _tenantMock.Setup(t => t.UserId).Returns("5");
            var clientePropio = new ClienteDto { Id = 11, Nombre = "Y", RFC = "R", Correo = "y@y.com", Telefono = "1", Direccion = "D", VendedorId = 5 };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(11, 1)).ReturnsAsync(clientePropio);

            var resultado = await _service.ObtenerPorIdAsync(11);

            resultado.Should().NotBeNull();
            resultado!.Id.Should().Be(11);
        }

        [Fact]
        public async Task ObtenerPorIdAsync_Supervisor_VeClienteDeSubordinado()
        {
            _tenantMock.Setup(t => t.IsAdmin).Returns(false);
            _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
            _tenantMock.Setup(t => t.IsSupervisor).Returns(true);
            _tenantMock.Setup(t => t.UserId).Returns("7");
            _usuarioRepoMock.Setup(r => r.ObtenerSubordinadoIdsAsync(7, 1)).ReturnsAsync(new List<int> { 20, 21 });
            var clienteSubordinado = new ClienteDto { Id = 12, Nombre = "Z", RFC = "R", Correo = "z@z.com", Telefono = "1", Direccion = "D", VendedorId = 20 };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(12, 1)).ReturnsAsync(clienteSubordinado);

            var resultado = await _service.ObtenerPorIdAsync(12);

            resultado.Should().NotBeNull();
        }

        [Fact]
        public async Task ObtenerPorIdAsync_Supervisor_NoVeClienteDeOtroEquipo()
        {
            _tenantMock.Setup(t => t.IsAdmin).Returns(false);
            _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
            _tenantMock.Setup(t => t.IsSupervisor).Returns(true);
            _tenantMock.Setup(t => t.UserId).Returns("7");
            _usuarioRepoMock.Setup(r => r.ObtenerSubordinadoIdsAsync(7, 1)).ReturnsAsync(new List<int> { 20, 21 });
            var clienteFuera = new ClienteDto { Id = 13, Nombre = "W", RFC = "R", Correo = "w@w.com", Telefono = "1", Direccion = "D", VendedorId = 99 };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(13, 1)).ReturnsAsync(clienteFuera);

            var resultado = await _service.ObtenerPorIdAsync(13);

            resultado.Should().BeNull("supervisor no debe ver clientes fuera de su equipo");
        }

        [Fact]
        public async Task ObtenerPorIdAsync_Admin_VeCualquierClienteDelTenant()
        {
            // Default fixture: IsAdmin=true, TenantId=1
            var cliente = new ClienteDto { Id = 14, Nombre = "Q", RFC = "R", Correo = "q@q.com", Telefono = "1", Direccion = "D", VendedorId = 99 };
            _repoMock.Setup(r => r.ObtenerPorIdAsync(14, 1)).ReturnsAsync(cliente);

            var resultado = await _service.ObtenerPorIdAsync(14);

            resultado.Should().NotBeNull();
        }
    }
}
