using HandySuites.Application.Clientes.DTOs;
using HandySuites.Application.Clientes.Interfaces;
using HandySuites.Application.Cobranza.DTOs;
using HandySuites.Application.Cobranza.Interfaces;
using HandySuites.Application.Cobranza.Services;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Application.Tracking.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Scope/RBAC tests for /api/mobile/cobros endpoints (CobroService).
///
/// Caso: mob-be-cobro
/// Rol bajo prueba: VENDEDOR
///
/// Reglas crÃ­ticas a validar:
///  - VENDEDOR sÃ³lo ve sus propios cobros (CobroService.ObtenerCobrosAsync inyecta usuarioId del JWT).
///  - ADMIN ve todos los cobros del tenant.
///  - Crear cobro valida pertenencia de Cliente y Pedido al tenant (BR-050).
///  - Cliente del pedido debe coincidir con ClienteId del cobro (BR-050b).
///  - No se cobra pedido Cancelado / Borrador (BR-050c).
///  - Monto > 0 (BR-C-monto).
///  - Fecha de cobro no futura ni > 20 aÃ±os antigua (BR-050d).
///  - IDOR: ObtenerPorId / EstadoCuenta scoped por tenant.
///
/// PatrÃ³n: igual a MobileClienteEndpointsTests â€” Mock&lt;ICurrentTenant&gt; +
/// Mock&lt;ICobroRepository&gt; + Mock&lt;IClienteRepository&gt; + Mock&lt;IPedidoRepository&gt;.
/// Evita WebApplicationFactory porque trae complicaciones de JWT.
/// </summary>
public class MobileCobroEndpointsScopeTests
{
    private const int TenantId = 1;
    private const int OtherTenantId = 99;
    private const int VendedorId = 42;
    private const int OtherVendedorId = 7;
    private const int AdminId = 1;

    private readonly Mock<ICobroRepository> _cobroRepoMock;
    private readonly Mock<IClienteRepository> _clienteRepoMock;
    private readonly Mock<IPedidoRepository> _pedidoRepoMock;

    public MobileCobroEndpointsScopeTests()
    {
        _cobroRepoMock = new Mock<ICobroRepository>();
        _clienteRepoMock = new Mock<IClienteRepository>();
        _pedidoRepoMock = new Mock<IPedidoRepository>();
    }

    private CobroService BuildService(Mock<ICurrentTenant> tenantMock)
    {
        return new CobroService(
            _cobroRepoMock.Object,
            tenantMock.Object,
            _clienteRepoMock.Object,
            _pedidoRepoMock.Object,
            Mock.Of<ISubscriptionFeatureGuard>());
    }

    private static Mock<ICurrentTenant> BuildVendedorTenant(int userId = VendedorId, int tenantId = TenantId)
    {
        var t = new Mock<ICurrentTenant>();
        t.Setup(x => x.TenantId).Returns(tenantId);
        t.Setup(x => x.UserId).Returns(userId.ToString());
        t.Setup(x => x.Role).Returns("VENDEDOR");
        t.Setup(x => x.IsAdminOrAbove).Returns(false);
        t.Setup(x => x.IsStrictAdmin).Returns(false);
        t.Setup(x => x.IsSuperAdmin).Returns(false);
        t.Setup(x => x.IsSupervisor).Returns(false);
#pragma warning disable CS0618
        t.Setup(x => x.IsAdmin).Returns(false);
#pragma warning restore CS0618
        return t;
    }

    private static Mock<ICurrentTenant> BuildAdminTenant(int userId = AdminId, int tenantId = TenantId)
    {
        var t = new Mock<ICurrentTenant>();
        t.Setup(x => x.TenantId).Returns(tenantId);
        t.Setup(x => x.UserId).Returns(userId.ToString());
        t.Setup(x => x.Role).Returns("ADMIN");
        t.Setup(x => x.IsAdminOrAbove).Returns(true);
        t.Setup(x => x.IsStrictAdmin).Returns(true);
        t.Setup(x => x.IsSuperAdmin).Returns(false);
        t.Setup(x => x.IsSupervisor).Returns(false);
#pragma warning disable CS0618
        t.Setup(x => x.IsAdmin).Returns(true);
#pragma warning restore CS0618
        return t;
    }

    private static ClienteDto BuildCliente(int id, int? overrideTenantId = null) => new()
    {
        Id = id,
        Nombre = $"Cliente {id}",
        RFC = "XAXX010101000",
        Correo = "test@test.com",
        Telefono = "5555555555",
        Direccion = "Direccion test",
        IdZona = 1,
        CategoriaClienteId = 1,
        Activo = true
    };

    private static PedidoDto BuildPedido(
        int id,
        int clienteId,
        EstadoPedido estado = EstadoPedido.Confirmado)
    {
        return new PedidoDto
        {
            Id = id,
            NumeroPedido = $"PED-{id:D5}",
            ClienteId = clienteId,
            ClienteNombre = $"Cliente {clienteId}",
            UsuarioId = VendedorId,
            UsuarioNombre = "Vendedor Test",
            FechaPedido = DateTime.UtcNow.AddDays(-5),
            Estado = estado,
            TipoVenta = TipoVenta.VentaDirecta,
            Subtotal = 100m,
            Descuento = 0m,
            Impuestos = 16m,
            Total = 116m
        };
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // GET /api/mobile/cobros/mis-cobros â€” RBAC scoping
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task ObtenerCobros_AsVendedor_InjectsOwnUsuarioIdFilter()
    {
        // Arrange â€” VENDEDOR no debe poder listar cobros de otros vendedores.
        var tenant = BuildVendedorTenant(userId: VendedorId);
        _cobroRepoMock
            .Setup(r => r.ObtenerCobrosAsync(TenantId, null, null, null, VendedorId))
            .ReturnsAsync(new List<CobroDto>
            {
                new() { Id = 1, UsuarioId = VendedorId, ClienteId = 10, Monto = 100m,
                        ClienteNombre = "C", UsuarioNombre = "V", MetodoPagoNombre = "Efectivo" }
            });

        var svc = BuildService(tenant);

        // Act
        var result = await svc.ObtenerCobrosAsync();

        // Assert â€” el repo recibiÃ³ VendedorId aunque el caller pasÃ³ usuarioId=null.
        result.Should().HaveCount(1);
        _cobroRepoMock.Verify(
            r => r.ObtenerCobrosAsync(TenantId, null, null, null, VendedorId),
            Times.Once);
    }

    [Fact]
    public async Task ObtenerCobros_AsVendedor_OverridesAttemptToQueryOtherVendor()
    {
        // Arrange â€” VENDEDOR intenta forzar usuarioId=otroVendedor; el Service debe sobrescribir.
        var tenant = BuildVendedorTenant(userId: VendedorId);
        _cobroRepoMock
            .Setup(r => r.ObtenerCobrosAsync(TenantId, null, null, null, VendedorId))
            .ReturnsAsync(new List<CobroDto>());

        var svc = BuildService(tenant);

        // Act â€” caller pasa OtherVendedorId; el service deberÃ­a igualmente forzar VendedorId.
        await svc.ObtenerCobrosAsync(usuarioId: OtherVendedorId);

        // Assert
        _cobroRepoMock.Verify(
            r => r.ObtenerCobrosAsync(TenantId, null, null, null, VendedorId),
            Times.Once);
        _cobroRepoMock.Verify(
            r => r.ObtenerCobrosAsync(TenantId, null, null, null, OtherVendedorId),
            Times.Never,
            "el Service NO debe permitir que un VENDEDOR consulte cobros de otro vendedor");
    }

    [Fact]
    public async Task ObtenerCobros_AsAdmin_DoesNotInjectUsuarioFilter()
    {
        // Arrange â€” ADMIN ve todos los cobros del tenant.
        var tenant = BuildAdminTenant();
        _cobroRepoMock
            .Setup(r => r.ObtenerCobrosAsync(TenantId, null, null, null, null))
            .ReturnsAsync(new List<CobroDto>
            {
                new() { Id = 1, UsuarioId = VendedorId, ClienteId = 10, Monto = 100m,
                        ClienteNombre = "C", UsuarioNombre = "V", MetodoPagoNombre = "Efectivo" },
                new() { Id = 2, UsuarioId = OtherVendedorId, ClienteId = 11, Monto = 200m,
                        ClienteNombre = "C2", UsuarioNombre = "V2", MetodoPagoNombre = "Efectivo" }
            });

        var svc = BuildService(tenant);

        // Act
        var result = await svc.ObtenerCobrosAsync();

        // Assert
        result.Should().HaveCount(2);
        _cobroRepoMock.Verify(
            r => r.ObtenerCobrosAsync(TenantId, null, null, null, null),
            Times.Once);
    }

    [Fact]
    public async Task ObtenerCobros_AsAdmin_RespectsExplicitUsuarioIdFilter()
    {
        // ADMIN sÃ­ puede filtrar manualmente por un vendedor especÃ­fico (dashboard).
        var tenant = BuildAdminTenant();
        _cobroRepoMock
            .Setup(r => r.ObtenerCobrosAsync(TenantId, null, null, null, VendedorId))
            .ReturnsAsync(new List<CobroDto>());

        var svc = BuildService(tenant);

        await svc.ObtenerCobrosAsync(usuarioId: VendedorId);

        _cobroRepoMock.Verify(
            r => r.ObtenerCobrosAsync(TenantId, null, null, null, VendedorId),
            Times.Once);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // POST /api/mobile/cobros â€” Validaciones de negocio + cross-tenant
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task CrearCobro_ThrowsWhenMontoIsZero()
    {
        var tenant = BuildVendedorTenant();
        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: null, ClienteId: 10, Monto: 0m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null, Modo: ModoCobroDto.Anticipo);

        var act = async () => await svc.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*mayor a cero*");
    }

    [Fact]
    public async Task CrearCobro_ThrowsWhenMontoIsNegative()
    {
        var tenant = BuildVendedorTenant();
        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: null, ClienteId: 10, Monto: -50m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null, Modo: ModoCobroDto.Anticipo);

        var act = async () => await svc.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*mayor a cero*");
    }

    [Fact]
    public async Task CrearCobro_ThrowsWhenClienteNotInTenant_IDOR()
    {
        // Arrange â€” cliente NO pertenece al tenant del caller (repo retorna null).
        var tenant = BuildVendedorTenant();
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(999, TenantId)).ReturnsAsync((ClienteDto?)null);

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: null, ClienteId: 999, Monto: 100m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null, Modo: ModoCobroDto.Anticipo);

        var act = async () => await svc.CrearAsync(dto);

        // Assert â€” debe lanzar antes de tocar el CobroRepository.
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cliente*no existe*o no pertenece*");
        _cobroRepoMock.Verify(
            r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()),
            Times.Never);
    }

    [Fact]
    public async Task CrearCobro_ThrowsWhenPedidoNotInTenant_IDOR()
    {
        var tenant = BuildVendedorTenant();
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(BuildCliente(10));
        _pedidoRepoMock.Setup(r => r.ObtenerPorIdAsync(500, TenantId)).ReturnsAsync((PedidoDto?)null);

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: 500, ClienteId: 10, Monto: 100m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null);

        var act = async () => await svc.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*pedido*no existe*o no pertenece*");
        _cobroRepoMock.Verify(
            r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()),
            Times.Never);
    }

    [Fact]
    public async Task CrearCobro_ThrowsWhenPedidoBelongsToDifferentCliente()
    {
        // BR-050b: el cliente del pedido debe coincidir con dto.ClienteId.
        var tenant = BuildVendedorTenant();
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(BuildCliente(10));
        // Pedido existe pero su ClienteId=20, NO 10.
        _pedidoRepoMock.Setup(r => r.ObtenerPorIdAsync(77, TenantId))
            .ReturnsAsync(BuildPedido(77, clienteId: 20, estado: EstadoPedido.Confirmado));

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: 77, ClienteId: 10, Monto: 50m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null);

        var act = async () => await svc.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*pedido no pertenece al cliente*");
    }

    [Fact]
    public async Task CrearCobro_ThrowsWhenPedidoIsCancelado()
    {
        var tenant = BuildVendedorTenant();
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(BuildCliente(10));
        _pedidoRepoMock.Setup(r => r.ObtenerPorIdAsync(78, TenantId))
            .ReturnsAsync(BuildPedido(78, clienteId: 10, estado: EstadoPedido.Cancelado));

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: 78, ClienteId: 10, Monto: 50m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null);

        var act = async () => await svc.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cancelado*");
    }

    [Fact]
    public async Task CrearCobro_ThrowsWhenPedidoIsBorrador()
    {
        var tenant = BuildVendedorTenant();
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(BuildCliente(10));
        _pedidoRepoMock.Setup(r => r.ObtenerPorIdAsync(79, TenantId))
            .ReturnsAsync(BuildPedido(79, clienteId: 10, estado: EstadoPedido.Borrador));

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: 79, ClienteId: 10, Monto: 50m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null);

        var act = async () => await svc.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*borrador*");
    }

    [Fact]
    public async Task CrearCobro_ThrowsWhenFechaCobroIsFuture()
    {
        var tenant = BuildVendedorTenant();
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(BuildCliente(10));

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: null, ClienteId: 10, Monto: 100m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow.AddDays(7), Referencia: null, Notas: null, Modo: ModoCobroDto.Anticipo);

        var act = async () => await svc.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*futura*");
    }

    [Fact]
    public async Task CrearCobro_ThrowsWhenFechaCobroIsTooOld()
    {
        var tenant = BuildVendedorTenant();
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(BuildCliente(10));

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: null, ClienteId: 10, Monto: 100m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow.AddYears(-25), Referencia: null, Notas: null, Modo: ModoCobroDto.Anticipo);

        var act = async () => await svc.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*antigua*");
    }

    [Fact]
    public async Task CrearCobro_HappyPath_CallsRepoWithCallerTenantAndUserId()
    {
        // Arrange â€” vendedor crea cobro vÃ¡lido con pedido confirmado.
        var tenant = BuildVendedorTenant(userId: VendedorId);
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(BuildCliente(10));
        _pedidoRepoMock.Setup(r => r.ObtenerPorIdAsync(100, TenantId))
            .ReturnsAsync(BuildPedido(100, clienteId: 10, estado: EstadoPedido.Confirmado));
        _cobroRepoMock
            .Setup(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), TenantId, VendedorId))
            .ReturnsAsync(555);

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: 100, ClienteId: 10, Monto: 116m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow.AddHours(-1), Referencia: "REC-001", Notas: "Pago contado");

        // Act
        var newId = await svc.CrearAsync(dto);

        // Assert â€” repo recibiÃ³ el tenantId y el userId del caller, no del DTO.
        newId.Should().Be(555);
        _cobroRepoMock.Verify(
            r => r.CrearAsync(It.Is<CobroCreateDto>(d => d.Monto == 116m && d.ClienteId == 10),
                              TenantId, VendedorId),
            Times.Once);
    }

    [Fact]
    public async Task CrearCobro_WithoutPedidoId_AllowsAdvancePayment()
    {
        // Cobro a cuenta (sin pedido) debe ser permitido siempre y cuando cliente exista.
        var tenant = BuildVendedorTenant(userId: VendedorId);
        _clienteRepoMock.Setup(r => r.ObtenerPorIdAsync(10, TenantId)).ReturnsAsync(BuildCliente(10));
        _cobroRepoMock
            .Setup(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), TenantId, VendedorId))
            .ReturnsAsync(777);

        var svc = BuildService(tenant);
        var dto = new CobroCreateDto(
            PedidoId: null, ClienteId: 10, Monto: 200m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: "Anticipo",
            Modo: ModoCobroDto.Anticipo);

        var newId = await svc.CrearAsync(dto);

        newId.Should().Be(777);
        _pedidoRepoMock.Verify(
            r => r.ObtenerPorIdAsync(It.IsAny<int>(), It.IsAny<int>()),
            Times.Never,
            "sin PedidoId no debe haber lookup del pedido repository");
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // GET /api/mobile/cobros/saldos â€” Tenant scoping
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task ObtenerSaldos_PassesTenantIdFromCurrentTenant()
    {
        var tenant = BuildVendedorTenant(tenantId: TenantId);
        _cobroRepoMock.Setup(r => r.ObtenerSaldosAsync(TenantId, null))
            .ReturnsAsync(new List<SaldoClienteDto>
            {
                new() { ClienteId = 10, ClienteNombre = "Cli", TotalFacturado = 500m,
                        TotalCobrado = 200m, SaldoPendiente = 300m, PedidosPendientes = 2 }
            });

        var svc = BuildService(tenant);

        var saldos = await svc.ObtenerSaldosAsync();

        saldos.Should().HaveCount(1);
        _cobroRepoMock.Verify(r => r.ObtenerSaldosAsync(TenantId, null), Times.Once);
        _cobroRepoMock.Verify(r => r.ObtenerSaldosAsync(OtherTenantId, It.IsAny<int?>()), Times.Never);
    }

    [Fact]
    public async Task ObtenerResumenCartera_PassesTenantIdFromCurrentTenant()
    {
        var tenant = BuildVendedorTenant(tenantId: TenantId);
        _cobroRepoMock.Setup(r => r.ObtenerResumenCarteraAsync(TenantId))
            .ReturnsAsync(new ResumenCarteraDto
            {
                TotalFacturado = 1000m, TotalCobrado = 600m,
                TotalPendiente = 400m, ClientesConSaldo = 3
            });

        var svc = BuildService(tenant);

        var resumen = await svc.ObtenerResumenCarteraAsync();

        resumen.TotalFacturado.Should().Be(1000m);
        resumen.TotalPendiente.Should().Be(400m);
        _cobroRepoMock.Verify(r => r.ObtenerResumenCarteraAsync(TenantId), Times.Once);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // GET /api/mobile/cobros/cliente/{id}/estado-cuenta â€” IDOR / tenant scope
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task ObtenerEstadoCuenta_PassesTenantIdToRepo()
    {
        var tenant = BuildVendedorTenant(tenantId: TenantId);
        _cobroRepoMock.Setup(r => r.ObtenerEstadoCuentaAsync(10, TenantId, false))
            .ReturnsAsync(new EstadoCuentaDto
            {
                ClienteId = 10, ClienteNombre = "Cli",
                TotalFacturado = 500m, TotalCobrado = 200m, SaldoPendiente = 300m
            });

        var svc = BuildService(tenant);

        var estado = await svc.ObtenerEstadoCuentaAsync(10);

        estado.Should().NotBeNull();
        estado!.ClienteId.Should().Be(10);
        _cobroRepoMock.Verify(r => r.ObtenerEstadoCuentaAsync(10, TenantId, false), Times.Once);
    }

    [Fact]
    public async Task ObtenerEstadoCuenta_ReturnsNull_WhenClienteIsInDifferentTenant()
    {
        // Si el repo (scoped por tenantId) devuelve null, el service propaga null
        // â†’ el endpoint responde 404. Esto previene IDOR cross-tenant.
        var tenant = BuildVendedorTenant(tenantId: TenantId);
        _cobroRepoMock.Setup(r => r.ObtenerEstadoCuentaAsync(999, TenantId, false))
            .ReturnsAsync((EstadoCuentaDto?)null);

        var svc = BuildService(tenant);

        var estado = await svc.ObtenerEstadoCuentaAsync(999);

        estado.Should().BeNull();
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // GET /api/mobile/cobros/{id} â€” equivalente a ObtenerPorIdAsync (defensa IDOR)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task ObtenerPorId_PassesTenantIdToRepo()
    {
        var tenant = BuildVendedorTenant(tenantId: TenantId);
        _cobroRepoMock.Setup(r => r.ObtenerPorIdAsync(1, TenantId))
            .ReturnsAsync(new CobroDto
            {
                Id = 1, UsuarioId = VendedorId, ClienteId = 10, Monto = 100m,
                ClienteNombre = "Cli", UsuarioNombre = "Vend", MetodoPagoNombre = "Efectivo"
            });

        var svc = BuildService(tenant);

        var cobro = await svc.ObtenerPorIdAsync(1);

        cobro.Should().NotBeNull();
        _cobroRepoMock.Verify(r => r.ObtenerPorIdAsync(1, TenantId), Times.Once);
    }

    [Fact]
    public async Task ObtenerPorId_ReturnsNull_ForCobroOfDifferentTenant()
    {
        var tenant = BuildVendedorTenant(tenantId: TenantId);
        _cobroRepoMock.Setup(r => r.ObtenerPorIdAsync(1, TenantId)).ReturnsAsync((CobroDto?)null);

        var svc = BuildService(tenant);

        var cobro = await svc.ObtenerPorIdAsync(1);

        cobro.Should().BeNull();
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Multi-tenant isolation: el TenantId del ICurrentTenant llega al repo en TODO call.
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [Fact]
    public async Task DifferentTenant_RoutesQueriesToOwnTenantOnly()
    {
        // Vendedor en TenantA NO debe poder consultar cobros del TenantB con un Service compartido.
        var tenantA = BuildVendedorTenant(userId: VendedorId, tenantId: TenantId);
        var tenantB = BuildVendedorTenant(userId: VendedorId, tenantId: OtherTenantId);

        _cobroRepoMock.Setup(r => r.ObtenerCobrosAsync(TenantId, null, null, null, VendedorId))
            .ReturnsAsync(new List<CobroDto> { new() {
                Id = 1, ClienteId = 1, UsuarioId = VendedorId,
                ClienteNombre = "A", UsuarioNombre = "V", MetodoPagoNombre = "Efectivo" } });
        _cobroRepoMock.Setup(r => r.ObtenerCobrosAsync(OtherTenantId, null, null, null, VendedorId))
            .ReturnsAsync(new List<CobroDto> { new() {
                Id = 99, ClienteId = 2, UsuarioId = VendedorId,
                ClienteNombre = "B", UsuarioNombre = "V", MetodoPagoNombre = "Efectivo" } });

        var svcA = BuildService(tenantA);
        var resA = await svcA.ObtenerCobrosAsync();
        resA.Should().HaveCount(1).And.OnlyContain(c => c.Id == 1);

        var svcB = BuildService(tenantB);
        var resB = await svcB.ObtenerCobrosAsync();
        resB.Should().HaveCount(1).And.OnlyContain(c => c.Id == 99);
    }
}



