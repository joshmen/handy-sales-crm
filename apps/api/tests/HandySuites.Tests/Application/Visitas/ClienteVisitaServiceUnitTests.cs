using FluentAssertions;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Visitas.DTOs;
using HandySuites.Application.Visitas.Interfaces;
using HandySuites.Application.Visitas.Services;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Visitas;

public class ClienteVisitaServiceUnitTests
{
    private readonly Mock<IClienteVisitaRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly ClienteVisitaService _service;

    public ClienteVisitaServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("1");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        _service = new ClienteVisitaService(_repo.Object, _tenant.Object);
    }

    private void SetVendedor(string userId = "42")
    {
        _tenant.SetupGet(t => t.UserId).Returns(userId);
        _tenant.SetupGet(t => t.Role).Returns("VENDEDOR");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(false);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);
    }

    private static ClienteVisitaDto VisitaDto(int id, int usuarioId) => new()
    {
        Id = id,
        ClienteId = 10,
        ClienteNombre = "Cliente X",
        UsuarioId = usuarioId,
        UsuarioNombre = "Vendedor Y",
    };

    // 1. Happy path crear
    [Fact]
    public async Task CrearAsync_DeberiaCrear_CuandoClienteExisteEnTenant()
    {
        var dto = new ClienteVisitaCreateDto { ClienteId = 99 };
        _repo.Setup(r => r.ExisteClienteEnTenantAsync(99, 1)).ReturnsAsync(true);
        _repo.Setup(r => r.CrearAsync(dto, 1, 1)).ReturnsAsync(123);

        var result = await _service.CrearAsync(dto);

        result.Should().Be(123);
        _repo.Verify(r => r.CrearAsync(dto, 1, 1), Times.Once);
    }

    // 2. Validacion cross-tenant en crear
    [Fact]
    public async Task CrearAsync_DeberiaLanzarInvalidOperation_CuandoClienteNoPerteneceAlTenant()
    {
        var dto = new ClienteVisitaCreateDto { ClienteId = 500 };
        _repo.Setup(r => r.ExisteClienteEnTenantAsync(500, 1)).ReturnsAsync(false);

        Func<Task> act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>();
        _repo.Verify(r => r.CrearAsync(It.IsAny<ClienteVisitaCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    // 3. RBAC vendedor fuerza UsuarioId en filtro
    [Fact]
    public async Task ObtenerPorFiltroAsync_DeberiaForzarUsuarioId_CuandoEsVendedor()
    {
        SetVendedor("42");
        var filtro = new ClienteVisitaFiltroDto { UsuarioId = 999 };
        var expected = new PaginatedResult<ClienteVisitaListaDto>();
        _repo.Setup(r => r.ObtenerPorFiltroAsync(It.IsAny<ClienteVisitaFiltroDto>(), 1)).ReturnsAsync(expected);

        var result = await _service.ObtenerPorFiltroAsync(filtro);

        filtro.UsuarioId.Should().Be(42);
        result.Should().BeSameAs(expected);
        _repo.Verify(r => r.ObtenerPorFiltroAsync(It.Is<ClienteVisitaFiltroDto>(f => f.UsuarioId == 42), 1), Times.Once);
    }

    // 4. Admin no se le sobrescribe UsuarioId
    [Fact]
    public async Task ObtenerPorFiltroAsync_NoDeberiaSobrescribirUsuarioId_CuandoEsAdmin()
    {
        var filtro = new ClienteVisitaFiltroDto { UsuarioId = 777 };
        var expected = new PaginatedResult<ClienteVisitaListaDto>();
        _repo.Setup(r => r.ObtenerPorFiltroAsync(filtro, 1)).ReturnsAsync(expected);

        var result = await _service.ObtenerPorFiltroAsync(filtro);

        filtro.UsuarioId.Should().Be(777);
        result.Should().BeSameAs(expected);
        _repo.Verify(r => r.ObtenerPorFiltroAsync(It.Is<ClienteVisitaFiltroDto>(f => f.UsuarioId == 777), 1), Times.Once);
    }

    // 5. RBAC vendedor no-owner en CheckIn → Unauthorized
    [Fact]
    public async Task CheckInAsync_DeberiaLanzarUnauthorized_CuandoVendedorNoEsOwner()
    {
        SetVendedor("42");
        var visita = VisitaDto(id: 7, usuarioId: 100); // otra persona
        _repo.Setup(r => r.ObtenerPorIdAsync(7, 1)).ReturnsAsync(visita);

        Func<Task> act = async () => await _service.CheckInAsync(7, new CheckInDto());

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repo.Verify(r => r.CheckInAsync(It.IsAny<int>(), It.IsAny<CheckInDto>(), It.IsAny<int>()), Times.Never);
    }

    // 6. Admin puede operar visita ajena
    [Fact]
    public async Task CheckInAsync_DeberiaPermitir_CuandoAdmin()
    {
        // ctor default = admin con UserId="1"
        var dto = new CheckInDto { Latitud = 1, Longitud = 2 };
        _repo.Setup(r => r.CheckInAsync(7, dto, 1)).ReturnsAsync(true);

        var result = await _service.CheckInAsync(7, dto);

        result.Should().BeTrue();
        // Como admin, NO debe consultar repo.ObtenerPorIdAsync para verificar ownership
        _repo.Verify(r => r.ObtenerPorIdAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
        _repo.Verify(r => r.CheckInAsync(7, dto, 1), Times.Once);
    }

    // 7. Vendedor owner puede CheckOut
    [Fact]
    public async Task CheckOutAsync_DeberiaPermitir_CuandoVendedorEsOwner()
    {
        SetVendedor("42");
        var visita = VisitaDto(id: 9, usuarioId: 42); // mismo vendedor
        var dto = new CheckOutDto();
        _repo.Setup(r => r.ObtenerPorIdAsync(9, 1)).ReturnsAsync(visita);
        _repo.Setup(r => r.CheckOutAsync(9, dto, 1)).ReturnsAsync(true);

        var result = await _service.CheckOutAsync(9, dto);

        result.Should().BeTrue();
        _repo.Verify(r => r.CheckOutAsync(9, dto, 1), Times.Once);
    }

    // 8. ObtenerVisitaActivaAsync parsea UserId
    [Fact]
    public async Task ObtenerVisitaActivaAsync_DeberiaRetornarVisita_CuandoExisteParaUsuario()
    {
        SetVendedor("55");
        var visita = VisitaDto(id: 3, usuarioId: 55);
        _repo.Setup(r => r.ObtenerVisitaActivaAsync(55, 1)).ReturnsAsync(visita);

        var result = await _service.ObtenerVisitaActivaAsync();

        result.Should().NotBeNull();
        result!.Id.Should().Be(3);
        result.UsuarioId.Should().Be(55);
        _repo.Verify(r => r.ObtenerVisitaActivaAsync(55, 1), Times.Once);
    }
}
