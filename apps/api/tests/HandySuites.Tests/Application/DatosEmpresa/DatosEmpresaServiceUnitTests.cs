using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.DatosEmpresa.DTOs;
using HandySuites.Application.DatosEmpresa.Interfaces;
using HandySuites.Application.DatosEmpresa.Services;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.DatosEmpresa;

public class DatosEmpresaServiceUnitTests
{
    private readonly Mock<IDatosEmpresaRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly DatosEmpresaService _service;

    public DatosEmpresaServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("1");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdmin).Returns(true);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        _service = new DatosEmpresaService(_repo.Object, _tenant.Object);
    }

    private static DatosEmpresaDto BuildDto(int tenantId = 1) => new(
        Id: 10,
        TenantId: tenantId,
        RazonSocial: "Jeyma SA de CV",
        IdentificadorFiscal: "JEY010101AAA",
        TipoIdentificadorFiscal: "RFC",
        Telefono: "5551234567",
        Email: "contacto@jeyma.com",
        Contacto: "Juan Perez",
        Direccion: "Av. Reforma 100",
        Ciudad: "CDMX",
        Estado: "CDMX",
        CodigoPostal: "06000",
        SitioWeb: "https://jeyma.com",
        Descripcion: "Distribuidor mayorista");

    private static DatosEmpresaUpdateDto BuildUpdateDto() => new(
        RazonSocial: "Jeyma SA de CV",
        IdentificadorFiscal: "JEY010101AAA",
        TipoIdentificadorFiscal: "RFC",
        Telefono: "5551234567",
        Email: "contacto@jeyma.com",
        Contacto: "Juan Perez",
        Direccion: "Av. Reforma 100",
        Ciudad: "CDMX",
        Estado: "CDMX",
        CodigoPostal: "06000",
        SitioWeb: "https://jeyma.com",
        Descripcion: "Distribuidor mayorista");

    [Fact]
    public async Task GetAsync_DeberiaRetornarDatosEmpresa_CuandoExiste()
    {
        // Arrange
        var expected = BuildDto(tenantId: 1);
        _repo.Setup(r => r.GetByTenantIdAsync(1)).ReturnsAsync(expected);

        // Act
        var result = await _service.GetAsync();

        // Assert
        result.Should().NotBeNull();
        result.Should().Be(expected);
        _repo.Verify(r => r.GetByTenantIdAsync(1), Times.Once);
    }

    [Fact]
    public async Task GetAsync_DeberiaRetornarNull_CuandoNoExiste()
    {
        // Arrange
        _repo.Setup(r => r.GetByTenantIdAsync(1)).ReturnsAsync((DatosEmpresaDto?)null);

        // Act
        var result = await _service.GetAsync();

        // Assert
        result.Should().BeNull();
        _repo.Verify(r => r.GetByTenantIdAsync(1), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_DeberiaRetornarDtoActualizado_CuandoSeInvoca()
    {
        // Arrange
        var input = BuildUpdateDto();
        var updated = BuildDto(tenantId: 1);
        _repo.Setup(r => r.CreateOrUpdateAsync(1, input, "user"))
             .ReturnsAsync(updated);

        // Act
        var result = await _service.UpdateAsync(input, "user");

        // Assert
        result.Should().Be(updated);
        _repo.Verify(r => r.CreateOrUpdateAsync(1, input, "user"), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_DeberiaUsarTenantIdActual_CuandoTenantCambia()
    {
        // Arrange — otro tenant para confirmar que no hay hardcode
        _tenant.SetupGet(t => t.TenantId).Returns(99);
        var input = BuildUpdateDto();
        var updated = BuildDto(tenantId: 99);
        _repo.Setup(r => r.CreateOrUpdateAsync(99, input, "user"))
             .ReturnsAsync(updated);

        // Act
        var result = await _service.UpdateAsync(input, "user");

        // Assert
        result.Should().Be(updated);
        _repo.Verify(r => r.CreateOrUpdateAsync(99, input, "user"), Times.Once);
        _repo.Verify(r => r.CreateOrUpdateAsync(1, It.IsAny<DatosEmpresaUpdateDto>(), It.IsAny<string>()), Times.Never);
    }
}
