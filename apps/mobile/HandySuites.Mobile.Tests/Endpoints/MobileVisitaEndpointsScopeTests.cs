using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Visitas.DTOs;
using HandySuites.Application.Visitas.Interfaces;
using HandySuites.Application.Visitas.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Scope / RBAC tests para el endpoint mobile de visitas.
/// Cubre la capa de servicio (ClienteVisitaService) que es la que aplica
/// las reglas reales de IDOR/RBAC para el rol VENDEDOR antes de tocar
/// el repositorio. Mockeamos IClienteVisitaRepository + ICurrentTenant
/// (mismo patrón que MobileClienteEndpointsTests / MobilePedidoEndpointsTests).
///
/// Reglas validadas:
/// 1. Vendedor solo puede CrearAsync si el cliente pertenece a su tenant.
/// 2. Vendedor recibe filtro forzado UsuarioId = self en ObtenerPorFiltroAsync (no ve visitas de otros vendedores).
/// 3. Vendedor NO puede CheckIn/CheckOut de visitas asignadas a otro vendedor (UnauthorizedAccessException).
/// 4. Vendedor SÍ puede CheckIn/CheckOut de SUS visitas.
/// 5. ObtenerMisVisitasAsync/ObtenerVisitasDelDiaAsync siempre usan UserId del current tenant.
/// 6. Admin/Supervisor/SuperAdmin tienen scope completo (no filtro forzado).
/// </summary>
public class MobileVisitaEndpointsScopeTests
{
    private const int TenantId = 1;
    private const int OtroTenantId = 2;
    private const int VendedorId = 42;
    private const int OtroVendedorId = 99;

    private readonly Mock<IClienteVisitaRepository> _repoMock;
    private readonly Mock<ICurrentTenant> _tenantMock;

    public MobileVisitaEndpointsScopeTests()
    {
        _repoMock = new Mock<IClienteVisitaRepository>();
        _tenantMock = new Mock<ICurrentTenant>();
        _tenantMock.Setup(t => t.TenantId).Returns(TenantId);
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────
    private void SetupVendedor(int userId = VendedorId)
    {
        _tenantMock.Setup(t => t.UserId).Returns(userId.ToString());
        _tenantMock.Setup(t => t.Role).Returns("VENDEDOR");
        _tenantMock.Setup(t => t.IsAdminOrAbove).Returns(false);
        _tenantMock.Setup(t => t.IsStrictAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSupervisor).Returns(false);
    }

    private void SetupAdmin(int userId = 1)
    {
        _tenantMock.Setup(t => t.UserId).Returns(userId.ToString());
        _tenantMock.Setup(t => t.Role).Returns("ADMIN");
        _tenantMock.Setup(t => t.IsAdminOrAbove).Returns(true);
        _tenantMock.Setup(t => t.IsStrictAdmin).Returns(true);
        _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSupervisor).Returns(false);
    }

    private void SetupSupervisor(int userId = 5)
    {
        _tenantMock.Setup(t => t.UserId).Returns(userId.ToString());
        _tenantMock.Setup(t => t.Role).Returns("SUPERVISOR");
        _tenantMock.Setup(t => t.IsAdminOrAbove).Returns(true);
        _tenantMock.Setup(t => t.IsStrictAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSuperAdmin).Returns(false);
        _tenantMock.Setup(t => t.IsSupervisor).Returns(true);
    }

    private ClienteVisitaService BuildService() => new(_repoMock.Object, _tenantMock.Object);

    private static ClienteVisitaDto FakeVisita(int id, int usuarioId, int clienteId = 10) => new()
    {
        Id = id,
        ClienteId = clienteId,
        ClienteNombre = "Cliente Test",
        UsuarioId = usuarioId,
        UsuarioNombre = "Vendedor Test",
        FechaProgramada = DateTime.UtcNow,
        TipoVisita = TipoVisita.Rutina,
        Resultado = ResultadoVisita.Pendiente,
        CreadoEn = DateTime.UtcNow
    };

    // ─────────────────────────────────────────────────────────────
    // 1. CrearAsync — validación de cliente en tenant
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CrearAsync_VendedorPuedeCrear_CuandoClientePerteneceASuTenant()
    {
        // Arrange
        SetupVendedor();
        var dto = new ClienteVisitaCreateDto { ClienteId = 10, TipoVisita = TipoVisita.Rutina };
        _repoMock.Setup(r => r.ExisteClienteEnTenantAsync(10, TenantId)).ReturnsAsync(true);
        _repoMock.Setup(r => r.CrearAsync(dto, VendedorId, TenantId)).ReturnsAsync(123);

        var service = BuildService();

        // Act
        var id = await service.CrearAsync(dto);

        // Assert
        id.Should().Be(123);
        _repoMock.Verify(r => r.CrearAsync(dto, VendedorId, TenantId), Times.Once);
    }

    [Fact]
    public async Task CrearAsync_VendedorRecibeError_CuandoClienteNoExisteEnTenant_IDORGuard()
    {
        // Cross-tenant IDOR: vendedor intenta crear visita para cliente de OTRO tenant.
        // El service debe validar via ExisteClienteEnTenantAsync ANTES de llamar al repo.
        SetupVendedor();
        var dto = new ClienteVisitaCreateDto { ClienteId = 999, TipoVisita = TipoVisita.Rutina };
        _repoMock.Setup(r => r.ExisteClienteEnTenantAsync(999, TenantId)).ReturnsAsync(false);

        var service = BuildService();

        // Act
        var act = async () => await service.CrearAsync(dto);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*no existe o no pertenece a tu empresa*");
        _repoMock.Verify(r => r.CrearAsync(It.IsAny<ClienteVisitaCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_UsaUserIdDelCurrentTenant_NoConfianEnPayload()
    {
        // El UsuarioId asignado siempre se toma del current tenant (JWT), nunca del DTO.
        // ClienteVisitaCreateDto no expone UsuarioId — la asignación es server-side.
        SetupVendedor(VendedorId);
        var dto = new ClienteVisitaCreateDto { ClienteId = 10 };
        _repoMock.Setup(r => r.ExisteClienteEnTenantAsync(10, TenantId)).ReturnsAsync(true);
        _repoMock.Setup(r => r.CrearAsync(It.IsAny<ClienteVisitaCreateDto>(), It.IsAny<int>(), It.IsAny<int>())).ReturnsAsync(1);

        var service = BuildService();

        // Act
        await service.CrearAsync(dto);

        // Assert — VendedorId (del JWT) se pasó, no un valor arbitrario.
        _repoMock.Verify(r => r.CrearAsync(dto, VendedorId, TenantId), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ObtenerPorFiltroAsync — scope forzado para vendedor
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ObtenerPorFiltroAsync_Vendedor_ForzaFiltroUsuarioIdAlSelf()
    {
        // Vendedor intenta espiar visitas de OtroVendedor pasando UsuarioId=99.
        // El service debe sobreescribir UsuarioId = self (42).
        SetupVendedor(VendedorId);
        var filtro = new ClienteVisitaFiltroDto { UsuarioId = OtroVendedorId };

        ClienteVisitaFiltroDto? capturedFiltro = null;
        _repoMock.Setup(r => r.ObtenerPorFiltroAsync(It.IsAny<ClienteVisitaFiltroDto>(), TenantId))
            .Callback<ClienteVisitaFiltroDto, int>((f, _) => capturedFiltro = f)
            .ReturnsAsync(new PaginatedResult<ClienteVisitaListaDto>
            {
                Items = new List<ClienteVisitaListaDto>(),
                TotalItems = 0,
                Pagina = 1,
                TamanoPagina = 20
            });

        var service = BuildService();

        // Act
        await service.ObtenerPorFiltroAsync(filtro);

        // Assert — el UsuarioId fue forzado a 42, no respeta el 99 intentado.
        capturedFiltro.Should().NotBeNull();
        capturedFiltro!.UsuarioId.Should().Be(VendedorId, "vendedor no puede consultar visitas de otro vendedor");
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_Admin_NoFuerzaFiltro()
    {
        // Admin SÍ puede consultar visitas de cualquier vendedor del tenant.
        SetupAdmin();
        var filtro = new ClienteVisitaFiltroDto { UsuarioId = OtroVendedorId };

        ClienteVisitaFiltroDto? capturedFiltro = null;
        _repoMock.Setup(r => r.ObtenerPorFiltroAsync(It.IsAny<ClienteVisitaFiltroDto>(), TenantId))
            .Callback<ClienteVisitaFiltroDto, int>((f, _) => capturedFiltro = f)
            .ReturnsAsync(new PaginatedResult<ClienteVisitaListaDto>
            {
                Items = new List<ClienteVisitaListaDto>(),
                TotalItems = 0,
                Pagina = 1,
                TamanoPagina = 20
            });

        var service = BuildService();

        // Act
        await service.ObtenerPorFiltroAsync(filtro);

        // Assert
        capturedFiltro!.UsuarioId.Should().Be(OtroVendedorId, "admin puede consultar visitas de cualquier vendedor");
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_SuperAdmin_NoFuerzaFiltro()
    {
        // SuperAdmin tampoco recibe filtro forzado.
        _tenantMock.Setup(t => t.UserId).Returns("1");
        _tenantMock.Setup(t => t.Role).Returns("SUPER_ADMIN");
        _tenantMock.Setup(t => t.IsAdminOrAbove).Returns(true);
        _tenantMock.Setup(t => t.IsSuperAdmin).Returns(true);
        var filtro = new ClienteVisitaFiltroDto { UsuarioId = OtroVendedorId };

        ClienteVisitaFiltroDto? capturedFiltro = null;
        _repoMock.Setup(r => r.ObtenerPorFiltroAsync(It.IsAny<ClienteVisitaFiltroDto>(), TenantId))
            .Callback<ClienteVisitaFiltroDto, int>((f, _) => capturedFiltro = f)
            .ReturnsAsync(new PaginatedResult<ClienteVisitaListaDto>
            {
                Items = new List<ClienteVisitaListaDto>(),
                TotalItems = 0,
                Pagina = 1,
                TamanoPagina = 20
            });

        var service = BuildService();

        // Act
        await service.ObtenerPorFiltroAsync(filtro);

        // Assert
        capturedFiltro!.UsuarioId.Should().Be(OtroVendedorId);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CheckIn / CheckOut — vendedor solo de sus visitas (IDOR guard)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CheckInAsync_Vendedor_LanzaUnauthorized_CuandoVisitaPerteneceAOtroVendedor()
    {
        // Vendedor 42 intenta hacer check-in de la visita 5 que pertenece al vendedor 99.
        SetupVendedor(VendedorId);
        var visitaAjena = FakeVisita(id: 5, usuarioId: OtroVendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(5, TenantId)).ReturnsAsync(visitaAjena);

        var service = BuildService();
        var dto = new CheckInDto { Latitud = 19.4, Longitud = -99.1 };

        // Act
        var act = async () => await service.CheckInAsync(5, dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*Solo el vendedor asignado*");
        _repoMock.Verify(r => r.CheckInAsync(It.IsAny<int>(), It.IsAny<CheckInDto>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CheckInAsync_Vendedor_OkCuandoVisitaPropia()
    {
        SetupVendedor(VendedorId);
        var visitaPropia = FakeVisita(id: 7, usuarioId: VendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(7, TenantId)).ReturnsAsync(visitaPropia);
        _repoMock.Setup(r => r.CheckInAsync(7, It.IsAny<CheckInDto>(), TenantId)).ReturnsAsync(true);

        var service = BuildService();
        var dto = new CheckInDto { Latitud = 19.4, Longitud = -99.1 };

        // Act
        var ok = await service.CheckInAsync(7, dto);

        // Assert
        ok.Should().BeTrue();
        _repoMock.Verify(r => r.CheckInAsync(7, dto, TenantId), Times.Once);
    }

    [Fact]
    public async Task CheckOutAsync_Vendedor_LanzaUnauthorized_CuandoVisitaPerteneceAOtroVendedor()
    {
        SetupVendedor(VendedorId);
        var visitaAjena = FakeVisita(id: 8, usuarioId: OtroVendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(8, TenantId)).ReturnsAsync(visitaAjena);

        var service = BuildService();
        var dto = new CheckOutDto { Resultado = ResultadoVisita.SinVenta };

        // Act
        var act = async () => await service.CheckOutAsync(8, dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repoMock.Verify(r => r.CheckOutAsync(It.IsAny<int>(), It.IsAny<CheckOutDto>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CheckOutAsync_Vendedor_OkCuandoVisitaPropia()
    {
        SetupVendedor(VendedorId);
        var visitaPropia = FakeVisita(id: 9, usuarioId: VendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(9, TenantId)).ReturnsAsync(visitaPropia);
        _repoMock.Setup(r => r.CheckOutAsync(9, It.IsAny<CheckOutDto>(), TenantId)).ReturnsAsync(true);

        var service = BuildService();
        var dto = new CheckOutDto { Resultado = ResultadoVisita.Venta };

        // Act
        var ok = await service.CheckOutAsync(9, dto);

        // Assert
        ok.Should().BeTrue();
        _repoMock.Verify(r => r.CheckOutAsync(9, dto, TenantId), Times.Once);
    }

    [Fact]
    public async Task CheckInAsync_Admin_PuedeCheckInDeCualquierVisita()
    {
        // Admin no requiere ser dueño de la visita — puede operar cualquier visita del tenant.
        SetupAdmin(userId: 1);
        var visitaDeVendedor = FakeVisita(id: 10, usuarioId: VendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(visitaDeVendedor);
        _repoMock.Setup(r => r.CheckInAsync(10, It.IsAny<CheckInDto>(), TenantId)).ReturnsAsync(true);

        var service = BuildService();
        var dto = new CheckInDto { Latitud = 19.4, Longitud = -99.1 };

        // Act
        var ok = await service.CheckInAsync(10, dto);

        // Assert — admin pasa el gate sin ser dueño
        ok.Should().BeTrue();
    }

    [Fact]
    public async Task CheckOutAsync_Supervisor_PuedeCheckOutDeCualquierVisita()
    {
        // Supervisor también pasa el gate (IsSupervisor → bypass del ownership check).
        SetupSupervisor(userId: 5);
        var visitaDeVendedor = FakeVisita(id: 11, usuarioId: VendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(11, TenantId)).ReturnsAsync(visitaDeVendedor);
        _repoMock.Setup(r => r.CheckOutAsync(11, It.IsAny<CheckOutDto>(), TenantId)).ReturnsAsync(true);

        var service = BuildService();
        var dto = new CheckOutDto { Resultado = ResultadoVisita.SinVenta };

        // Act
        var ok = await service.CheckOutAsync(11, dto);

        // Assert
        ok.Should().BeTrue();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ObtenerMisVisitasAsync / ObtenerVisitasDelDiaAsync / ObtenerVisitaActivaAsync
    //    Siempre usan el UserId del current tenant — el vendedor no puede pasar otro
    //    porque el método no acepta parámetro de usuario.
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ObtenerMisVisitasAsync_UsaUserIdDelTenant()
    {
        SetupVendedor(VendedorId);
        _repoMock.Setup(r => r.ObtenerMisVisitasAsync(VendedorId, TenantId))
            .ReturnsAsync(new List<ClienteVisitaListaDto>());

        var service = BuildService();

        // Act
        await service.ObtenerMisVisitasAsync();

        // Assert — el repo recibe el UserId del JWT, no de un parámetro
        _repoMock.Verify(r => r.ObtenerMisVisitasAsync(VendedorId, TenantId), Times.Once);
        _repoMock.Verify(r => r.ObtenerMisVisitasAsync(OtroVendedorId, It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task ObtenerVisitasDelDiaAsync_UsaUserIdDelTenant()
    {
        SetupVendedor(VendedorId);
        _repoMock.Setup(r => r.ObtenerVisitasDelDiaAsync(VendedorId, It.IsAny<DateTime>(), TenantId))
            .ReturnsAsync(new List<ClienteVisitaListaDto>());

        var service = BuildService();

        // Act
        await service.ObtenerVisitasDelDiaAsync();

        // Assert
        _repoMock.Verify(r => r.ObtenerVisitasDelDiaAsync(VendedorId, It.IsAny<DateTime>(), TenantId), Times.Once);
    }

    [Fact]
    public async Task ObtenerVisitaActivaAsync_UsaUserIdDelTenant()
    {
        SetupVendedor(VendedorId);
        _repoMock.Setup(r => r.ObtenerVisitaActivaAsync(VendedorId, TenantId)).ReturnsAsync((ClienteVisitaDto?)null);

        var service = BuildService();

        // Act
        var visita = await service.ObtenerVisitaActivaAsync();

        // Assert
        visita.Should().BeNull();
        _repoMock.Verify(r => r.ObtenerVisitaActivaAsync(VendedorId, TenantId), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ObtenerPorIdAsync — usa siempre tenantId del current tenant (no cross-tenant)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ObtenerPorIdAsync_UsaTenantIdDelCurrentTenant_NoCrossTenant()
    {
        // Vendedor en tenant 1 consulta visita id=50. El repo recibe tenantId=1.
        // Si la visita es de tenant 2, el repo NO devolverá nada (filtro a nivel query del repo).
        SetupVendedor(VendedorId);
        _repoMock.Setup(r => r.ObtenerPorIdAsync(50, TenantId)).ReturnsAsync((ClienteVisitaDto?)null);

        var service = BuildService();

        // Act
        var visita = await service.ObtenerPorIdAsync(50);

        // Assert — tenantId del request fue el del JWT, no uno arbitrario.
        visita.Should().BeNull();
        _repoMock.Verify(r => r.ObtenerPorIdAsync(50, TenantId), Times.Once);
        _repoMock.Verify(r => r.ObtenerPorIdAsync(It.IsAny<int>(), OtroTenantId), Times.Never);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Reportes — usan UserId del current tenant (cobertura del /resumen/diario y /resumen/semanal)
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ObtenerMiResumenDiarioAsync_UsaUserIdDelTenant()
    {
        SetupVendedor(VendedorId);
        _repoMock.Setup(r => r.ObtenerResumenDiarioAsync(VendedorId, It.IsAny<DateTime>(), TenantId))
            .ReturnsAsync(new VisitaResumenDiarioDto { Fecha = DateTime.UtcNow });

        var service = BuildService();

        // Act
        var resumen = await service.ObtenerMiResumenDiarioAsync();

        // Assert
        resumen.Should().NotBeNull();
        _repoMock.Verify(r => r.ObtenerResumenDiarioAsync(VendedorId, It.IsAny<DateTime>(), TenantId), Times.Once);
    }

    [Fact]
    public async Task ObtenerMiResumenSemanalAsync_UsaUserIdDelTenant_YDefaultFechaInicio()
    {
        // Cuando fechaInicio es null, debe usar UtcNow - 6 días (semana actual).
        SetupVendedor(VendedorId);
        DateTime? capturedFecha = null;
        _repoMock.Setup(r => r.ObtenerResumenSemanalAsync(VendedorId, It.IsAny<DateTime>(), TenantId))
            .Callback<int, DateTime, int>((_, f, _) => capturedFecha = f)
            .ReturnsAsync(new List<VisitaResumenDiarioDto>());

        var service = BuildService();

        // Act
        await service.ObtenerMiResumenSemanalAsync();

        // Assert
        capturedFecha.Should().NotBeNull();
        capturedFecha!.Value.Should().BeCloseTo(DateTime.UtcNow.AddDays(-6), TimeSpan.FromMinutes(1));
    }
}
