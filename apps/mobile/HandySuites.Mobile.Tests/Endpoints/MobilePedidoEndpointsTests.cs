using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.MovimientosInventario.DTOs;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Application.Pedidos.Services;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests del hot path VENDEDOR mobile para crear pedido + transiciones
/// (enviar/confirmar/entregar/cancelar) + isolation cross-tenant en GET.
///
/// NO podemos usar WebApplicationFactory porque el HandySuites.Mobile.Tests
/// project no esta wired con esa fixture (ver MobilePedidoEagerSaveTests
/// comentario al respecto). Por eso testeamos el PedidoService directo con
/// IPedidoRepository mockeado + ICurrentTenant simulado para VENDEDOR.
///
/// Cobertura:
///  - CrearAsync valida cliente activo, lista de precios, productos activos,
///    duplicados y stock para VentaDirecta. (mapping a HTTP 400/201/409).
///  - Transiciones ConfirmarAsync / EntregarAsync / CancelarAsync delegan al
///    repo con el TenantId del contexto (anti-spoofing).
///  - ObtenerPorIdAsync filtra por TenantId — pedido de otro tenant → null
///    (el endpoint traduce a 404).
///  - UsuarioId del JWT se respeta (NUNCA del body) en CrearAsync.
/// </summary>
public class MobilePedidoEndpointsTests
{
    private const int TenantId = 1;
    private const int UsuarioId = 10;
    private const int ClienteId = 300;
    private const int ProductoId = 200;
    private const int OtroTenantId = 2;

    private readonly Mock<IPedidoRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<IUsuarioRepository> _usuarios = new();
    private readonly Mock<MovimientoInventarioService> _movimientos;
    private readonly Mock<ITransactionManager> _tx = new();
    private readonly PedidoService _service;

    public MobilePedidoEndpointsTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(TenantId);
        _tenant.SetupGet(t => t.UserId).Returns(UsuarioId.ToString());
        _tenant.SetupGet(t => t.Role).Returns("VENDEDOR");
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        // MovimientoInventarioService no se puede mockear con Moq sin ctor
        // virtual; lo pasamos como null! cuando no se usa (igual que
        // MobilePedidoEagerSaveTests).
        _movimientos = new Mock<MovimientoInventarioService>(MockBehavior.Loose, null!, null!, null!);

        // ITransactionManager: ejecuta el delegate inline (no real DB tx).
        _tx.Setup(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task<int>>>()))
            .Returns<Func<Task<int>>>(f => f());

        _service = new PedidoService(
            _repo.Object,
            _tenant.Object,
            _usuarios.Object,
            null!,
            _tx.Object);
    }

    private static PedidoCreateDto BuildCreateDto(TipoVenta tipo = TipoVenta.Preventa, decimal cantidad = 5m)
    {
        return new PedidoCreateDto
        {
            ClienteId = ClienteId,
            TipoVenta = tipo,
            Detalles = new List<DetallePedidoCreateDto>
            {
                new() { ProductoId = ProductoId, Cantidad = cantidad, PrecioUnitario = 20m, Descuento = 0m }
            }
        };
    }

    // ============ CrearAsync (POST /api/mobile/pedidos) ============

    [Fact]
    public async Task CrearAsync_HappyPath_DelegatesWithTenantAndUsuarioFromContext()
    {
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(ProductoId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), UsuarioId, TenantId))
            .ReturnsAsync(123);

        var newId = await _service.CrearAsync(BuildCreateDto());

        newId.Should().Be(123);
        // Anti-spoofing: TenantId y UsuarioId vienen de ICurrentTenant (claim JWT),
        // nunca del payload — el endpoint mobile no acepta esos campos en el DTO.
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), UsuarioId, TenantId), Times.Once);
    }

    [Fact]
    public async Task CrearAsync_ClienteDesactivado_Throws400()
    {
        // El endpoint mapea InvalidOperationException → 400 BadRequest.
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(false);

        var act = () => _service.CrearAsync(BuildCreateDto());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*desactivado*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_ProductosDuplicados_Throws400()
    {
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(true);

        var dto = new PedidoCreateDto
        {
            ClienteId = ClienteId,
            TipoVenta = TipoVenta.Preventa,
            Detalles = new List<DetallePedidoCreateDto>
            {
                new() { ProductoId = ProductoId, Cantidad = 1m, PrecioUnitario = 10m },
                new() { ProductoId = ProductoId, Cantidad = 2m, PrecioUnitario = 10m }
            }
        };

        var act = () => _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*duplicados*");
    }

    [Fact]
    public async Task CrearAsync_ProductoDesactivado_Throws400()
    {
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(ProductoId, TenantId)).ReturnsAsync(false);

        var act = () => _service.CrearAsync(BuildCreateDto());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*desactivado*");
    }

    [Fact]
    public async Task CrearAsync_VentaDirecta_StockInsuficiente_Throws()
    {
        // Hot path: VENDEDOR intenta venta directa con stock insuficiente.
        // Server debe bloquear ANTES de crear el pedido (CRITICAL-1 audit).
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(ProductoId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ObtenerStockDisponibleAsync(ProductoId, TenantId)).ReturnsAsync(2m);
        _repo.Setup(r => r.ObtenerNombreProductoAsync(ProductoId, TenantId)).ReturnsAsync("Coca 600ml");

        var dto = BuildCreateDto(TipoVenta.VentaDirecta, cantidad: 10m);

        var act = () => _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Stock insuficiente*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_DescuentoMayorAlSubtotal_Throws400()
    {
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(ProductoId, TenantId)).ReturnsAsync(true);

        var dto = new PedidoCreateDto
        {
            ClienteId = ClienteId,
            TipoVenta = TipoVenta.Preventa,
            Detalles = new List<DetallePedidoCreateDto>
            {
                new() { ProductoId = ProductoId, Cantidad = 1m, PrecioUnitario = 10m, Descuento = 999m }
            }
        };

        var act = () => _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*descuento*excede*");
    }

    // ============ Transiciones de estado ============

    [Fact]
    public async Task ConfirmarAsync_DelegatesWithTenantFromContext()
    {
        _repo.Setup(r => r.CambiarEstadoAsync(50, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId))
            .ReturnsAsync(true);

        var ok = await _service.ConfirmarAsync(50);

        ok.Should().BeTrue();
        _repo.Verify(r => r.CambiarEstadoAsync(50, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId), Times.Once);
    }

    [Fact]
    public async Task EntregarAsync_DelegatesNotasYTenant()
    {
        _repo.Setup(r => r.CambiarEstadoAsync(50, EstadoPedido.Entregado, "Entregado en bodega", TenantId))
            .ReturnsAsync(true);

        var ok = await _service.EntregarAsync(50, "Entregado en bodega");

        ok.Should().BeTrue();
    }

    [Fact]
    public async Task CancelarAsync_DefaultMotivo_DelegatesPedidoCanceladoLiteral()
    {
        _repo.Setup(r => r.CambiarEstadoAsync(50, EstadoPedido.Cancelado, "Pedido cancelado", TenantId))
            .ReturnsAsync(true);

        var ok = await _service.CancelarAsync(50, motivo: null);

        ok.Should().BeTrue();
    }

    [Fact]
    public async Task ConfirmarAsync_PedidoDeOtroTenant_RepoReturnsFalse()
    {
        // Cross-tenant guard: el repo filtra por TenantId; pedido de tenant 2 → false.
        // El endpoint mapea false → 400 con "No se pudo confirmar el pedido".
        _repo.Setup(r => r.CambiarEstadoAsync(50, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId))
            .ReturnsAsync(false);

        var ok = await _service.ConfirmarAsync(50);

        ok.Should().BeFalse();
    }

    // ============ Isolation cross-tenant en GET ============

    [Fact]
    public async Task ObtenerPorIdAsync_PedidoDeOtroTenant_ReturnsNull()
    {
        // Pedido id 999 existe pero pertenece a tenant 2. Service pasa TenantId=1
        // al repo, repo filtra y retorna null. Endpoint traduce a 404.
        _repo.Setup(r => r.ObtenerPorIdAsync(999, TenantId)).ReturnsAsync((PedidoDto?)null);

        var result = await _service.ObtenerPorIdAsync(999);

        result.Should().BeNull();
        _repo.Verify(r => r.ObtenerPorIdAsync(999, TenantId), Times.Once);
        _repo.Verify(r => r.ObtenerPorIdAsync(999, OtroTenantId), Times.Never);
    }

    [Fact]
    public async Task ObtenerMisPedidosAsync_FiltraPorUsuarioYTenantDeContext()
    {
        // Vendedor solo ve SUS pedidos (anti-info-disclosure).
        _repo.Setup(r => r.ObtenerPorUsuarioAsync(UsuarioId, TenantId))
            .ReturnsAsync(new List<PedidoListaDto>());

        await _service.ObtenerMisPedidosAsync();

        _repo.Verify(r => r.ObtenerPorUsuarioAsync(UsuarioId, TenantId), Times.Once);
    }

    // ============ Gestion de detalles ============

    [Fact]
    public async Task AgregarDetalleAsync_DelegatesConTenant()
    {
        var dto = new DetallePedidoCreateDto { ProductoId = ProductoId, Cantidad = 3m, PrecioUnitario = 50m };
        _repo.Setup(r => r.AgregarDetalleAsync(50, dto, TenantId)).ReturnsAsync(true);

        var ok = await _service.AgregarDetalleAsync(50, dto);

        ok.Should().BeTrue();
        _repo.Verify(r => r.AgregarDetalleAsync(50, dto, TenantId), Times.Once);
    }

    [Fact]
    public async Task EliminarDetalleAsync_DetalleNoExiste_ReturnsFalseParaMapeo404()
    {
        _repo.Setup(r => r.EliminarDetalleAsync(50, 999, TenantId)).ReturnsAsync(false);

        var ok = await _service.EliminarDetalleAsync(50, 999);

        ok.Should().BeFalse();
    }

    // ════════════════════════════════════════════════════════════
    // ADMIN scope coverage — HIGH gap inventory pre-prod 2026-06-06.
    //   ADMIN debe poder crear/confirmar/entregar pedidos en mobile con
    //   scope completo del tenant (incluyendo pedidos creados por
    //   OTROS vendedores). Tests anteriores cubren VENDEDOR; estos
    //   cubren los entry points ADMIN.
    // ════════════════════════════════════════════════════════════

    private const int AdminUserId = 99;
    private const int OtroVendedorId = 88;

    private PedidoService BuildServiceAsAdmin()
    {
        var adminTenant = new Mock<ICurrentTenant>();
        adminTenant.SetupGet(t => t.TenantId).Returns(TenantId);
        adminTenant.SetupGet(t => t.UserId).Returns(AdminUserId.ToString());
        adminTenant.SetupGet(t => t.Role).Returns("ADMIN");
        adminTenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        adminTenant.SetupGet(t => t.IsStrictAdmin).Returns(true);
        adminTenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        adminTenant.SetupGet(t => t.IsSupervisor).Returns(false);

        return new PedidoService(
            _repo.Object,
            adminTenant.Object,
            _usuarios.Object,
            null!,
            _tx.Object);
    }

    [Fact]
    public async Task Crear_ConJwtAdmin_ReturnaCreated()
    {
        // ADMIN crea pedido — el endpoint debe persistir con CreadoPor=AdminUserId
        // (NO con cualquier vendedor del payload). Antes (audit pre-prod 2026-06-06)
        // NO habia test cubriendo esto: el endpoint asignaba UsuarioId desde el body
        // si venia, dejando spoofing posible.
        var service = BuildServiceAsAdmin();
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(ProductoId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), AdminUserId, TenantId))
            .ReturnsAsync(7001);

        var newId = await service.CrearAsync(BuildCreateDto());

        newId.Should().Be(7001);
        // El service paso AdminUserId al repo, no otro usuario del body.
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), AdminUserId, TenantId), Times.Once);
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), OtroVendedorId, It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task Confirmar_ConJwtAdmin_SobrePedidoDeOtroVendedor_RetornaOk()
    {
        // ADMIN debe poder confirmar pedido creado por VENDEDOR1 (CreadoPor != AdminUserId).
        // El repo NO filtra por UsuarioId — solo por TenantId — entonces CambiarEstadoAsync
        // retorna true para cualquier pedido del tenant del admin.
        var service = BuildServiceAsAdmin();
        const int pedidoDeVendedor = 5500;
        _repo.Setup(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId))
            .ReturnsAsync(true);

        var ok = await service.ConfirmarAsync(pedidoDeVendedor);

        ok.Should().BeTrue();
        _repo.Verify(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId), Times.Once);
    }

    [Fact]
    public async Task Entregar_ConJwtAdmin_SobrePedidoDeOtroVendedor_RetornaOk()
    {
        // ADMIN debe poder marcar entregado un pedido EnRuta creado por otro vendedor.
        var service = BuildServiceAsAdmin();
        const int pedidoDeVendedor = 5501;
        _repo.Setup(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Entregado, It.IsAny<string>(), TenantId))
            .ReturnsAsync(true);

        var ok = await service.EntregarAsync(pedidoDeVendedor, "Entregado por admin");

        ok.Should().BeTrue();
        _repo.Verify(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Entregado, "Entregado por admin", TenantId), Times.Once);
    }

    [Fact]
    public async Task Get_ConJwtAdmin_ListaPedidosTenantWide()
    {
        // ObtenerPorFiltroAsync con ADMIN context: NO debe agregar filtro por UsuarioId
        // automatico. Solo VENDEDOR autofiltra a sus pedidos; ADMIN ve tenant-wide.
        var service = BuildServiceAsAdmin();
        var filtro = new PedidoFiltroDto { Pagina = 1, TamanoPagina = 20 };
        _repo.Setup(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null))
            .ReturnsAsync(new PaginatedResult<PedidoListaDto>
            {
                Items = new List<PedidoListaDto>(),
                TotalItems = 0
            });

        await service.ObtenerPorFiltroAsync(filtro);

        // Critico: filterByUsuarioIds debe ser null (no list con AdminUserId).
        _repo.Verify(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null), Times.Once);
        // El service NO mutilo el filtro asignando filtro.UsuarioId = AdminUserId
        filtro.UsuarioId.Should().BeNull("ADMIN no debe autorestringir a su propio UsuarioId");
    }

    [Fact]
    public async Task Confirmar_CrossTenant_RetornaFalse()
    {
        // ADMIN tenant 1 intenta confirmar pedido tenant 2 → repo retorna false
        // (porque CambiarEstadoAsync filtra por TenantId=1 y no encuentra el pedido).
        // El endpoint mapea false → 400 con mensaje "No se pudo confirmar".
        // El audit pide 404 idealmente; documentamos el comportamiento actual.
        var service = BuildServiceAsAdmin();
        _repo.Setup(r => r.CambiarEstadoAsync(9999, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId))
            .ReturnsAsync(false); // pedido no encontrado en tenant 1

        var ok = await service.ConfirmarAsync(9999);

        // BUG / FIX TODO: el endpoint hoy devuelve 400 BadRequest ("No se pudo
        // confirmar el pedido") cuando deberia devolver 404 NotFound para
        // cross-tenant. Distinguir requiere que el repo retorne un Outcome con
        // distinto status. Cambio sugerido: usar CambiarEstadoDetalladoAsync con
        // CambiarEstadoOutcome.NotFound y mapear a 404.
        ok.Should().BeFalse("repo no encuentra el pedido al filtrar por tenant del admin");
    }
}
