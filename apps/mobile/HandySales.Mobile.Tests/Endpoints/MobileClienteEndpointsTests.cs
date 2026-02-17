using HandySales.Application.Clientes.DTOs;
using HandySales.Application.Clientes.Interfaces;
using HandySales.Application.Clientes.Services;
using HandySales.Shared.Multitenancy;
using Moq;

namespace HandySales.Mobile.Tests.Endpoints;

public class MobileClienteEndpointsTests
{
    private readonly Mock<IClienteRepository> _repoMock;
    private readonly Mock<ICurrentTenant> _tenantMock;
    private readonly ClienteService _clienteService;
    private readonly List<ClienteDto> _testClientes;

    public MobileClienteEndpointsTests()
    {
        _repoMock = new Mock<IClienteRepository>();
        _tenantMock = new Mock<ICurrentTenant>();
        _tenantMock.Setup(t => t.TenantId).Returns(1);

        _clienteService = new ClienteService(_repoMock.Object, _tenantMock.Object);

        _testClientes = new List<ClienteDto>
        {
            new()
            {
                Id = 1,
                Nombre = "Cliente Uno",
                RFC = "XAXX010101000",
                Correo = "cliente1@test.com",
                Telefono = "5551234567",
                Direccion = "Calle 1 #123",
                IdZona = 1,
                CategoriaClienteId = 1,
                Latitud = 19.4326,
                Longitud = -99.1332,
                Activo = true
            },
            new()
            {
                Id = 2,
                Nombre = "Cliente Dos",
                RFC = "XAXX020202000",
                Correo = "cliente2@test.com",
                Telefono = "5559876543",
                Direccion = "Calle 2 #456",
                IdZona = 1,
                CategoriaClienteId = 1,
                Latitud = 19.4350,
                Longitud = -99.1350,
                Activo = true
            },
            new()
            {
                Id = 3,
                Nombre = "Cliente Tres",
                RFC = "XAXX030303000",
                Correo = "cliente3@test.com",
                Telefono = "5551112233",
                Direccion = "Calle 3 #789",
                IdZona = 2,
                CategoriaClienteId = 1,
                Latitud = 19.3500,
                Longitud = -99.2000,
                Activo = true
            },
            new()
            {
                Id = 4,
                Nombre = "Empresa ABC",
                RFC = "ABC040404ABC",
                Correo = "abc@empresa.com",
                Telefono = "5554445566",
                Direccion = "Av Principal #100",
                IdZona = 2,
                CategoriaClienteId = 1,
                Latitud = null,
                Longitud = null,
                Activo = true
            }
        };
    }

    [Fact]
    public async Task ObtenerClientesAsync_ReturnsAllClients()
    {
        // Arrange
        _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testClientes);

        // Act
        var clientes = await _clienteService.ObtenerClientesAsync();

        // Assert
        clientes.Should().HaveCount(4);
    }

    [Fact]
    public async Task ObtenerClientesAsync_FilterByBusqueda_ReturnsMatchingClients()
    {
        // Arrange
        var busqueda = "Cliente Uno";
        _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testClientes);

        // Act
        var clientes = await _clienteService.ObtenerClientesAsync();
        var filtrados = clientes.Where(c =>
            c.Nombre.ToLower().Contains(busqueda.ToLower())).ToList();

        // Assert
        filtrados.Should().HaveCount(1);
        filtrados.First().Nombre.Should().Be("Cliente Uno");
    }

    [Fact]
    public async Task ObtenerClientesAsync_FilterByZona_ReturnsClientsInZone()
    {
        // Arrange
        var zonaId = 1;
        _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testClientes);

        // Act
        var clientes = await _clienteService.ObtenerClientesAsync();
        var filtrados = clientes.Where(c => c.IdZona == zonaId).ToList();

        // Assert
        filtrados.Should().HaveCount(2);
        filtrados.All(c => c.IdZona == zonaId).Should().BeTrue();
    }

    [Fact]
    public async Task ObtenerClientesAsync_Pagination_ReturnsCorrectPage()
    {
        // Arrange
        var pagina = 1;
        var porPagina = 2;
        _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testClientes);

        // Act
        var clientes = await _clienteService.ObtenerClientesAsync();
        var paginados = clientes
            .Skip((pagina - 1) * porPagina)
            .Take(porPagina)
            .ToList();

        // Assert
        paginados.Should().HaveCount(2);
    }

    [Fact]
    public async Task ObtenerPorIdAsync_ReturnsClient_WhenExists()
    {
        // Arrange
        _repoMock.Setup(r => r.ObtenerPorIdAsync(1, 1))
            .ReturnsAsync(_testClientes.First());

        // Act
        var cliente = await _clienteService.ObtenerPorIdAsync(1);

        // Assert
        cliente.Should().NotBeNull();
        cliente!.Id.Should().Be(1);
        cliente.Nombre.Should().Be("Cliente Uno");
    }

    [Fact]
    public async Task ObtenerPorIdAsync_ReturnsNull_WhenNotExists()
    {
        // Arrange
        _repoMock.Setup(r => r.ObtenerPorIdAsync(999, 1))
            .ReturnsAsync((ClienteDto?)null);

        // Act
        var cliente = await _clienteService.ObtenerPorIdAsync(999);

        // Assert
        cliente.Should().BeNull();
    }

    [Fact]
    public async Task FilterClientesCercanos_ReturnsClientsWithinRadius()
    {
        // Arrange
        var latitud = 19.4326;
        var longitud = -99.1332;
        var radioKm = 5.0;
        _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testClientes);

        // Act
        var clientes = await _clienteService.ObtenerClientesAsync();
        var cercanos = clientes
            .Where(c => c.Latitud.HasValue && c.Longitud.HasValue)
            .Select(c => new
            {
                cliente = c,
                distancia = CalcularDistanciaKm(latitud, longitud, c.Latitud!.Value, c.Longitud!.Value)
            })
            .Where(x => x.distancia <= radioKm)
            .OrderBy(x => x.distancia)
            .ToList();

        // Assert
        cercanos.Should().HaveCount(2);
        cercanos.First().cliente.Nombre.Should().Be("Cliente Uno");
    }

    [Fact]
    public async Task FilterClientesCercanos_ExcludesDistantClients()
    {
        // Arrange
        var latitud = 19.5000;
        var longitud = -99.0000;
        var radioKm = 1.0;
        _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testClientes);

        // Act
        var clientes = await _clienteService.ObtenerClientesAsync();
        var cercanos = clientes
            .Where(c => c.Latitud.HasValue && c.Longitud.HasValue)
            .Select(c => new
            {
                cliente = c,
                distancia = CalcularDistanciaKm(latitud, longitud, c.Latitud!.Value, c.Longitud!.Value)
            })
            .Where(x => x.distancia <= radioKm)
            .ToList();

        // Assert
        cercanos.Should().BeEmpty();
    }

    [Fact]
    public async Task ObtenerClienteUbicacion_ReturnsLocationData()
    {
        // Arrange
        _repoMock.Setup(r => r.ObtenerPorIdAsync(1, 1))
            .ReturnsAsync(_testClientes.First());

        // Act
        var cliente = await _clienteService.ObtenerPorIdAsync(1);

        // Assert
        cliente.Should().NotBeNull();
        cliente!.Latitud.Should().NotBeNull();
        cliente.Longitud.Should().NotBeNull();
        cliente.Direccion.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task SearchClientes_ByEmail_ReturnsMatchingClient()
    {
        // Arrange
        var busqueda = "cliente1@test.com";
        _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testClientes);

        // Act
        var clientes = await _clienteService.ObtenerClientesAsync();
        var filtrados = clientes.Where(c =>
            c.Correo.ToLower().Contains(busqueda.ToLower())).ToList();

        // Assert
        filtrados.Should().HaveCount(1);
        filtrados.First().Correo.Should().Be("cliente1@test.com");
    }

    [Fact]
    public async Task SearchClientes_ByTelefono_ReturnsMatchingClient()
    {
        // Arrange
        var busqueda = "5551234567";
        _repoMock.Setup(r => r.ObtenerPorTenantAsync(1))
            .ReturnsAsync(_testClientes);

        // Act
        var clientes = await _clienteService.ObtenerClientesAsync();
        var filtrados = clientes.Where(c =>
            c.Telefono.Contains(busqueda)).ToList();

        // Assert
        filtrados.Should().HaveCount(1);
        filtrados.First().Telefono.Should().Be("5551234567");
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_ReturnsPaginatedResults()
    {
        // Arrange
        var filtro = new ClienteFiltroDto
        {
            ZonaId = 1,
            Pagina = 1,
            TamanoPagina = 10
        };
        var expectedResult = new ClientePaginatedResult
        {
            Items = _testClientes
                .Where(c => c.IdZona == 1)
                .Select(c => new ClienteListaDto
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    RFC = c.RFC,
                    Correo = c.Correo,
                    Telefono = c.Telefono,
                    Activo = c.Activo
                }).ToList(),
            TotalItems = 2,
            Pagina = 1,
            TamanoPagina = 10
        };
        _repoMock.Setup(r => r.ObtenerPorFiltroAsync(filtro, 1))
            .ReturnsAsync(expectedResult);

        // Act
        var result = await _clienteService.ObtenerPorFiltroAsync(filtro);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(2);
        result.TotalItems.Should().Be(2);
    }

    private static double CalcularDistanciaKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double radioTierra = 6371;
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return radioTierra * c;
    }

    private static double ToRadians(double grados) => grados * Math.PI / 180;
}
