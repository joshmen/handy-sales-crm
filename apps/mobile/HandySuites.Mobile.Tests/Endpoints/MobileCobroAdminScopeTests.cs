using HandySuites.Application.Clientes.DTOs;
using HandySuites.Application.Clientes.Interfaces;
using HandySuites.Application.Cobranza.DTOs;
using HandySuites.Application.Cobranza.Interfaces;
using HandySuites.Application.Cobranza.Services;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Caso: adm-be-mobile-cobro-scope
///
/// Verifica el contrato de RBAC del endpoint /api/mobile/cobros visto desde un ADMIN.
/// El CobroService es el que mapea Role → scope query: ADMIN/SUPERVISOR/SUPER_ADMIN
/// ven todos los cobros del tenant; VENDEDOR queda forzado a usuarioId == su propio id
/// (no puede impersonar a otro vendedor pasando `usuarioId` por query).
///
/// Cubre:
///   - Happy path ADMIN: NO se aplica filtro de usuarioId al repo.
///   - Happy path SUPERVISOR: IsAdminOrAbove = true, mismo trato que ADMIN.
///   - Negativo VENDEDOR (IDOR self-elevation): aunque pase ?usuarioId=99,
///     el service debe SOBREESCRIBIR con su propio UserId antes de llamar al repo.
///   - Cross-tenant IDOR: TenantId del caller es el que llega al repo, no
///     puede el ADMIN del tenant 1 leer cobros del tenant 2 vía param injection
///     (no hay param de tenant en el endpoint — verificamos que el service usa SIEMPRE _tenant.TenantId).
///   - CrearAsync: ADMIN puede crear cobros normalmente; cross-tenant cliente/pedido
///     son rechazados por las validaciones BR-050 a nivel app-layer.
///
/// Estilo igual a MobileAuthEndpointsTests.cs (InMemory + Mocks, sin WebApplicationFactory).
/// </summary>
public class MobileCobroAdminScopeTests
{
    private static Mock<ICurrentTenant> BuildTenantMock(int tenantId, string userId, string role)
    {
        var mock = new Mock<ICurrentTenant>();
        mock.SetupGet(t => t.TenantId).Returns(tenantId);
        mock.SetupGet(t => t.UserId).Returns(userId);
        mock.SetupGet(t => t.Role).Returns(role);

        var isSuper = role == "SUPER_ADMIN";
        var isAdmin = role == "ADMIN";
        var isSupervisor = role == "SUPERVISOR";
        var isAdminOrAbove = isSuper || isAdmin || isSupervisor;
        var isStrictAdmin = isSuper || isAdmin;

        mock.SetupGet(t => t.IsSuperAdmin).Returns(isSuper);
        mock.SetupGet(t => t.IsSupervisor).Returns(isSupervisor);
        mock.SetupGet(t => t.IsAdminOrAbove).Returns(isAdminOrAbove);
        mock.SetupGet(t => t.IsStrictAdmin).Returns(isStrictAdmin);
#pragma warning disable CS0618
        mock.SetupGet(t => t.IsAdmin).Returns(isAdmin || isSuper);
#pragma warning restore CS0618

        return mock;
    }

    // ─────────────────────────────────────────────────────────────
    // ObtenerCobrosAsync — scope por rol
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ObtenerCobros_AsAdmin_DoesNotForceUsuarioIdFilter()
    {
        // Arrange — ADMIN tenant 1, sin pasar usuarioId
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "ADMIN");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerCobrosAsync(1, null, null, null, null))
            .ReturnsAsync(new List<CobroDto>
            {
                new() { Id = 1, ClienteId = 5, UsuarioId = 99, Monto = 100, ClienteNombre = "C1", UsuarioNombre = "Vendedor99", MetodoPagoNombre = "Efectivo" },
                new() { Id = 2, ClienteId = 6, UsuarioId = 88, Monto = 200, ClienteNombre = "C2", UsuarioNombre = "Vendedor88", MetodoPagoNombre = "Efectivo" }
            });

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        // Act
        var result = await service.ObtenerCobrosAsync();

        // Assert — ADMIN ve cobros de OTROS vendedores (99, 88) sin filtrar
        result.Should().HaveCount(2);
        result.Select(c => c.UsuarioId).Should().BeEquivalentTo(new[] { 99, 88 });

        // Repo invoked con usuarioId=null (NO se inyecta el UserId del caller)
        repo.Verify(r => r.ObtenerCobrosAsync(1, null, null, null, null), Times.Once);
    }

    [Fact]
    public async Task ObtenerCobros_AsSupervisor_DoesNotForceUsuarioIdFilter()
    {
        // SUPERVISOR cae en IsAdminOrAbove=true (per ICurrentTenant doc).
        // Sprint pre-prod #11 — comportamiento documentado: SUPERVISOR ve cobros
        // del equipo, no solo los suyos. Si esto cambia (a "solo su equipo"),
        // este test fallará y deberá adaptarse junto al fix de service.
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "SUPERVISOR");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerCobrosAsync(1, null, null, null, null))
            .ReturnsAsync(new List<CobroDto>());

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        await service.ObtenerCobrosAsync();

        repo.Verify(r => r.ObtenerCobrosAsync(1, null, null, null, null), Times.Once);
        repo.Verify(r => r.ObtenerCobrosAsync(It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), 10), Times.Never);
    }

    [Fact]
    public async Task ObtenerCobros_AsSuperAdmin_DoesNotForceUsuarioIdFilter()
    {
        var tenant = BuildTenantMock(tenantId: 1, userId: "1", role: "SUPER_ADMIN");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerCobrosAsync(1, null, null, null, null))
            .ReturnsAsync(new List<CobroDto>());

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        await service.ObtenerCobrosAsync();

        repo.Verify(r => r.ObtenerCobrosAsync(1, null, null, null, null), Times.Once);
    }

    [Fact]
    public async Task ObtenerCobros_AsVendedor_ForcesOwnUserIdEvenIfCallerPassesAnother()
    {
        // RBAC NEGATIVO — IDOR self-elevation: VENDEDOR 50 intenta leer cobros del vendedor 99.
        // El service DEBE sobreescribir con su propio UserId.
        var tenant = BuildTenantMock(tenantId: 1, userId: "50", role: "VENDEDOR");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerCobrosAsync(1, null, null, null, 50))
            .ReturnsAsync(new List<CobroDto>());

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        // Act — el caller pasa usuarioId=99 con intención maliciosa
        await service.ObtenerCobrosAsync(usuarioId: 99);

        // Assert — el repo recibe 50 (su propio UserId), NO 99.
        repo.Verify(r => r.ObtenerCobrosAsync(1, null, null, null, 50), Times.Once);
        repo.Verify(r => r.ObtenerCobrosAsync(It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), 99), Times.Never);
    }

    [Fact]
    public async Task ObtenerCobros_PassesCallerTenantId_NotOverridableByParam()
    {
        // Cross-tenant scope: el caller pertenece al tenant 7, el repo SIEMPRE
        // recibe 7 — no existe un parámetro de tenant en el endpoint que pudiera
        // ser tampered. Verificamos invariante.
        var tenant = BuildTenantMock(tenantId: 7, userId: "10", role: "ADMIN");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerCobrosAsync(7, null, null, null, null))
            .ReturnsAsync(new List<CobroDto>());

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        await service.ObtenerCobrosAsync();

        repo.Verify(r => r.ObtenerCobrosAsync(7, null, null, null, null), Times.Once);
        repo.Verify(r => r.ObtenerCobrosAsync(It.Is<int>(t => t != 7), It.IsAny<int?>(), It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<int?>()), Times.Never);
    }

    [Fact]
    public async Task ObtenerCobros_AsAdmin_RespectsClienteIdFilter()
    {
        // ADMIN puede filtrar por clienteId (param legítimo) — debe pasar al repo.
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "ADMIN");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerCobrosAsync(1, 42, null, null, null))
            .ReturnsAsync(new List<CobroDto>());

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        await service.ObtenerCobrosAsync(clienteId: 42);

        repo.Verify(r => r.ObtenerCobrosAsync(1, 42, null, null, null), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────
    // ObtenerSaldosAsync / ObtenerEstadoCuentaAsync / ObtenerResumenCarteraAsync — scope tenant
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task ObtenerSaldos_AsAdmin_UsesCallerTenantId()
    {
        var tenant = BuildTenantMock(tenantId: 3, userId: "10", role: "ADMIN");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerSaldosAsync(3, null))
            .ReturnsAsync(new List<SaldoClienteDto>());

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        await service.ObtenerSaldosAsync();

        repo.Verify(r => r.ObtenerSaldosAsync(3, null), Times.Once);
        repo.Verify(r => r.ObtenerSaldosAsync(It.Is<int>(t => t != 3), It.IsAny<int?>()), Times.Never);
    }

    [Fact]
    public async Task ObtenerEstadoCuenta_AsAdmin_PassesCallerTenantId()
    {
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "ADMIN");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerEstadoCuentaAsync(42, 1, false))
            .ReturnsAsync(new EstadoCuentaDto
            {
                ClienteId = 42,
                ClienteNombre = "Cliente42",
                TotalFacturado = 1000m,
                TotalCobrado = 600m,
                SaldoPendiente = 400m
            });

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        var result = await service.ObtenerEstadoCuentaAsync(42);

        result.Should().NotBeNull();
        result!.ClienteId.Should().Be(42);
        repo.Verify(r => r.ObtenerEstadoCuentaAsync(42, 1, false), Times.Once);
    }

    [Fact]
    public async Task ObtenerResumenCartera_AsAdmin_PassesCallerTenantId()
    {
        var tenant = BuildTenantMock(tenantId: 9, userId: "10", role: "ADMIN");
        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.ObtenerResumenCarteraAsync(9))
            .ReturnsAsync(new ResumenCarteraDto
            {
                TotalFacturado = 5000m,
                TotalCobrado = 3000m,
                TotalPendiente = 2000m,
                ClientesConSaldo = 3
            });

        var service = new CobroService(repo.Object, tenant.Object, Mock.Of<IClienteRepository>(), Mock.Of<IPedidoRepository>());

        var resumen = await service.ObtenerResumenCarteraAsync();

        resumen.Should().NotBeNull();
        resumen.TotalPendiente.Should().Be(2000m);
        repo.Verify(r => r.ObtenerResumenCarteraAsync(9), Times.Once);
    }

    // ─────────────────────────────────────────────────────────────
    // CrearAsync — ADMIN puede crear, IDOR cross-tenant rechazada
    // ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task CrearCobro_AsAdmin_WithValidClienteAndPedido_Succeeds()
    {
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "ADMIN");

        var clienteRepo = new Mock<IClienteRepository>();
        clienteRepo.Setup(r => r.ObtenerPorIdAsync(5, 1))
            .ReturnsAsync(new ClienteDto { Id = 5, Nombre = "Cliente5" , RFC = "", Correo = "", Telefono = "", Direccion = "" });

        var pedidoRepo = new Mock<IPedidoRepository>();
        pedidoRepo.Setup(r => r.ObtenerPorIdAsync(20, 1))
            .ReturnsAsync(new PedidoDto {
                Id = 20,
                ClienteId = 5,
                Estado = EstadoPedido.Confirmado,
                NumeroPedido = "P-001"
            , ClienteNombre = "", UsuarioNombre = "" });

        var repo = new Mock<ICobroRepository>();
        repo.Setup(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), 1, 10))
            .ReturnsAsync(123);

        var service = new CobroService(repo.Object, tenant.Object, clienteRepo.Object, pedidoRepo.Object);

        var dto = new CobroCreateDto(
            PedidoId: 20,
            ClienteId: 5,
            Monto: 250m,
            MetodoPago: 0,
            FechaCobro: DateTime.UtcNow.AddHours(-1),
            Referencia: null,
            Notas: null);

        var id = await service.CrearAsync(dto);

        id.Should().Be(123);
        repo.Verify(r => r.CrearAsync(dto, 1, 10), Times.Once);
    }

    [Fact]
    public async Task CrearCobro_AsAdmin_WithCrossTenantCliente_Throws()
    {
        // IDOR cross-tenant: ADMIN tenant 1 intenta crear cobro para cliente del tenant 2.
        // El ClienteRepository lookup pasa el TenantId del caller, así que devuelve null.
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "ADMIN");

        var clienteRepo = new Mock<IClienteRepository>();
        clienteRepo.Setup(r => r.ObtenerPorIdAsync(99, 1))
            .ReturnsAsync((ClienteDto?)null);

        var repo = new Mock<ICobroRepository>();
        var service = new CobroService(repo.Object, tenant.Object, clienteRepo.Object, Mock.Of<IPedidoRepository>());

        var dto = new CobroCreateDto(
            PedidoId: null,
            ClienteId: 99,
            Monto: 100m,
            MetodoPago: 0,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        var act = async () => await service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cliente*no existe*o no pertenece*");
        repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearCobro_AsAdmin_WithPedidoFromAnotherCliente_Throws()
    {
        // BR-050b — pedido vinculado al cobro debe ser del mismo cliente.
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "ADMIN");

        var clienteRepo = new Mock<IClienteRepository>();
        clienteRepo.Setup(r => r.ObtenerPorIdAsync(5, 1))
            .ReturnsAsync(new ClienteDto { Id = 5, Nombre = "Cliente5" , RFC = "", Correo = "", Telefono = "", Direccion = "" });

        var pedidoRepo = new Mock<IPedidoRepository>();
        pedidoRepo.Setup(r => r.ObtenerPorIdAsync(20, 1))
            .ReturnsAsync(new PedidoDto {
                Id = 20,
                ClienteId = 7, // pedido es de otro cliente
                Estado = EstadoPedido.Confirmado,
                NumeroPedido = "P-001"
            , ClienteNombre = "", UsuarioNombre = "" });

        var repo = new Mock<ICobroRepository>();
        var service = new CobroService(repo.Object, tenant.Object, clienteRepo.Object, pedidoRepo.Object);

        var dto = new CobroCreateDto(
            PedidoId: 20,
            ClienteId: 5,
            Monto: 100m,
            MetodoPago: 0,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        var act = async () => await service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*pedido no pertenece al cliente*");
        repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearCobro_AsAdmin_WithCanceladoPedido_Throws()
    {
        // BR-050c — pedido cancelado no se puede cobrar.
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "ADMIN");

        var clienteRepo = new Mock<IClienteRepository>();
        clienteRepo.Setup(r => r.ObtenerPorIdAsync(5, 1))
            .ReturnsAsync(new ClienteDto { Id = 5, Nombre = "Cliente5" , RFC = "", Correo = "", Telefono = "", Direccion = "" });

        var pedidoRepo = new Mock<IPedidoRepository>();
        pedidoRepo.Setup(r => r.ObtenerPorIdAsync(20, 1))
            .ReturnsAsync(new PedidoDto {
                Id = 20,
                ClienteId = 5,
                Estado = EstadoPedido.Cancelado,
                NumeroPedido = "P-001"
            , ClienteNombre = "", UsuarioNombre = "" });

        var repo = new Mock<ICobroRepository>();
        var service = new CobroService(repo.Object, tenant.Object, clienteRepo.Object, pedidoRepo.Object);

        var dto = new CobroCreateDto(
            PedidoId: 20,
            ClienteId: 5,
            Monto: 100m,
            MetodoPago: 0,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        var act = async () => await service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*pedido cancelado*");
    }

    [Fact]
    public async Task CrearCobro_AsAdmin_WithMontoZero_Throws()
    {
        // BR-C-monto — monto > 0 estricto.
        var tenant = BuildTenantMock(tenantId: 1, userId: "10", role: "ADMIN");
        var service = new CobroService(
            Mock.Of<ICobroRepository>(),
            tenant.Object,
            Mock.Of<IClienteRepository>(),
            Mock.Of<IPedidoRepository>());

        var dto = new CobroCreateDto(
            PedidoId: null,
            ClienteId: 5,
            Monto: 0m,
            MetodoPago: 0,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        var act = async () => await service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*mayor a cero*");
    }
}
