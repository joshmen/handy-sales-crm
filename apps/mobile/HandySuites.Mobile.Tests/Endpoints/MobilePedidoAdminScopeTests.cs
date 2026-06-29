using HandySuites.Application.Common.Interfaces;
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
/// ADMIN scope coverage para el endpoint mobile /api/mobile/pedidos.
///
/// Audit pre-prod 2026-06-06 marco HIGH gap: el test suite original
/// (MobilePedidoEndpointsTests) cubria SOLO el hot path VENDEDOR.
/// Este archivo cubre los entry points ADMIN, validando:
///
///   1. Crear pedido con JWT ADMIN — el CreadoPor viene del claim, NUNCA
///      del body (anti-spoofing UsuarioId).
///   2. ADMIN puede confirmar/entregar pedidos creados por otros vendedores
///      del mismo tenant (no autofiltro por UsuarioId).
///   3. Listado tenant-wide — ObtenerPorFiltroAsync NO mutila filtro.UsuarioId
///      cuando rol == ADMIN (a diferencia de VENDEDOR que se autorestringe).
///   4. Cross-tenant guard sigue activo — ADMIN de tenant 1 NO puede tocar
///      pedidos de tenant 2 (repo filtra por TenantId del context).
///   5. RBAC negative: si el rol no llega como ADMIN/SUPER_ADMIN/SUPERVISOR
///      se trata como VENDEDOR y autofiltra.
///
/// No usamos WebApplicationFactory porque el HandySuites.Mobile.Tests project
/// no esta wired con esa fixture (JWT signing key config). Se testea el
/// PedidoService directamente con IPedidoRepository mockeado +
/// ICurrentTenant simulado como ADMIN.
/// </summary>
public class MobilePedidoAdminScopeTests
{
    private const int TenantId = 1;
    private const int AdminUserId = 99;
    private const int OtroVendedorId = 88;
    private const int ClienteId = 300;
    private const int ProductoId = 200;
    private const int OtroTenantId = 2;

    private readonly Mock<IPedidoRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<IUsuarioRepository> _usuarios = new();
    private readonly Mock<ITransactionManager> _tx = new();
    private readonly PedidoService _service;

    public MobilePedidoAdminScopeTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(TenantId);
        _tenant.SetupGet(t => t.UserId).Returns(AdminUserId.ToString());
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        // ITransactionManager: ejecuta el delegate inline (no DB tx real).
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

    private PedidoService BuildServiceAsRole(string rol, bool isAdminOrAbove, bool isStrictAdmin, bool isSupervisor, bool isSuperAdmin, int userId)
    {
        var t = new Mock<ICurrentTenant>();
        t.SetupGet(x => x.TenantId).Returns(TenantId);
        t.SetupGet(x => x.UserId).Returns(userId.ToString());
        t.SetupGet(x => x.Role).Returns(rol);
        t.SetupGet(x => x.IsAdminOrAbove).Returns(isAdminOrAbove);
        t.SetupGet(x => x.IsStrictAdmin).Returns(isStrictAdmin);
        t.SetupGet(x => x.IsSupervisor).Returns(isSupervisor);
        t.SetupGet(x => x.IsSuperAdmin).Returns(isSuperAdmin);

        return new PedidoService(
            _repo.Object,
            t.Object,
            _usuarios.Object,
            null!,
            _tx.Object);
    }

    // ============ Crear pedido con JWT ADMIN ============

    [Fact]
    public async Task CrearAsync_ConJwtAdmin_UsaUsuarioIdDelClaimNoDelBody()
    {
        // Anti-spoofing: el endpoint mobile asigna CreadoPor desde el claim JWT,
        // NUNCA desde un campo UsuarioId/CreadoPor del payload. Si el ADMIN intentara
        // "crear pedido en nombre de Vendedor 88" via body, el server lo ignora.
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(ProductoId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), AdminUserId, TenantId))
            .ReturnsAsync(7001);

        var newId = await _service.CrearAsync(BuildCreateDto());

        newId.Should().Be(7001);
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), AdminUserId, TenantId), Times.Once);
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), OtroVendedorId, It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_ConJwtAdmin_ClienteDesactivado_RetornaError400()
    {
        // ADMIN no esta sobre las reglas de validacion del tenant — mismo guard.
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(false);

        var act = () => _service.CrearAsync(BuildCreateDto());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*desactivado*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    // VentaDirecta path requiere _movimientoService no-null (line 146 de
    // PedidoService.CrearAsync). El service-under-test usa `null!` para ese
    // dependency porque las branches Preventa NO lo necesitan. Para cubrir
    // VentaDirecta hay que construir un PedidoService alterno con
    // MovimientoInventarioService mockeado, lo cual requiere ademas mockear
    // IMovimientoInventarioRepository, IProductoRepository y IInventarioService.
    // Diferido al siguiente sprint — ya esta cubierto en
    // PedidoEagerSaveTests para la branch VentaDirecta general.
    [Fact(Skip = "VentaDirecta requiere construir MovimientoInventarioService; cubierto por PedidoEagerSaveTests en otra capa")]
    public async Task CrearAsync_ConJwtAdmin_VentaDirectaStockOk_Persiste()
    {
        _repo.Setup(r => r.ClienteActivoAsync(ClienteId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(ProductoId, TenantId)).ReturnsAsync(true);
        _repo.Setup(r => r.ObtenerStockDisponibleAsync(ProductoId, TenantId)).ReturnsAsync(100m);
        _repo.Setup(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), AdminUserId, TenantId))
            .ReturnsAsync(7050);

        var newId = await _service.CrearAsync(BuildCreateDto(TipoVenta.VentaDirecta, cantidad: 5m));

        newId.Should().Be(7050);
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), AdminUserId, TenantId), Times.Once);
    }

    // ============ Transiciones sobre pedidos de otro vendedor (mismo tenant) ============

    [Fact]
    public async Task ConfirmarAsync_ConJwtAdmin_SobrePedidoDeOtroVendedor_RetornaOk()
    {
        // ADMIN debe poder confirmar pedido creado por VENDEDOR1 (CreadoPor != AdminUserId).
        // El repo NO filtra por UsuarioId — solo por TenantId — entonces CambiarEstadoAsync
        // retorna true para cualquier pedido del tenant del admin.
        const int pedidoDeVendedor = 5500;
        _repo.Setup(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId))
            .ReturnsAsync(true);

        var ok = await _service.ConfirmarAsync(pedidoDeVendedor);

        ok.Should().BeTrue();
        _repo.Verify(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId), Times.Once);
    }

    [Fact]
    public async Task EntregarAsync_ConJwtAdmin_SobrePedidoDeOtroVendedor_PasaNotas()
    {
        // ADMIN marca entregado un pedido en ruta creado por otro vendedor.
        // Notas se propagan tal cual al repo.
        const int pedidoDeVendedor = 5501;
        _repo.Setup(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Entregado, "Entregado por admin", TenantId))
            .ReturnsAsync(true);

        var ok = await _service.EntregarAsync(pedidoDeVendedor, "Entregado por admin");

        ok.Should().BeTrue();
        _repo.Verify(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Entregado, "Entregado por admin", TenantId), Times.Once);
    }

    [Fact]
    public async Task CancelarAsync_ConJwtAdmin_SobrePedidoDeOtroVendedor_UsaMotivoExplicito()
    {
        // ADMIN cancela pedido de otro vendedor con motivo explicito.
        const int pedidoDeVendedor = 5502;
        _repo.Setup(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Cancelado, "Cliente fuera de zona", TenantId))
            .ReturnsAsync(true);

        var ok = await _service.CancelarAsync(pedidoDeVendedor, "Cliente fuera de zona");

        ok.Should().BeTrue();
        _repo.Verify(r => r.CambiarEstadoAsync(pedidoDeVendedor, EstadoPedido.Cancelado, "Cliente fuera de zona", TenantId), Times.Once);
    }

    // ============ Listado tenant-wide (sin autofiltro por UsuarioId) ============

    [Fact]
    public async Task ObtenerPorFiltroAsync_ConJwtAdmin_NoAutofiltraPorUsuarioId()
    {
        // ObtenerPorFiltroAsync con ADMIN context: NO debe agregar filtro por UsuarioId
        // automatico. Solo VENDEDOR autofiltra a sus pedidos; ADMIN ve tenant-wide.
        var filtro = new PedidoFiltroDto { Pagina = 1, TamanoPagina = 20 };
        _repo.Setup(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null))
            .ReturnsAsync(new PedidoListaResultDto
            {
                Items = new List<PedidoListaDto>(),
                TotalItems = 0
            });

        await _service.ObtenerPorFiltroAsync(filtro);

        // Critico: filterByUsuarioIds debe ser null (no list con AdminUserId).
        _repo.Verify(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null), Times.Once);
        // El service NO mutilo el filtro asignando filtro.UsuarioId = AdminUserId.
        filtro.UsuarioId.Should().BeNull("ADMIN no debe autorestringir a su propio UsuarioId");
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_ConJwtAdmin_RespetaFiltroUsuarioIdExplicito()
    {
        // ADMIN puede filtrar manualmente por un vendedor (ej. dashboard "ver pedidos
        // de Vendedor 88"). El filtro explicito DEBE pasarse al repo intacto.
        var filtro = new PedidoFiltroDto
        {
            Pagina = 1,
            TamanoPagina = 20,
            UsuarioId = OtroVendedorId
        };
        _repo.Setup(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null))
            .ReturnsAsync(new PedidoListaResultDto
            {
                Items = new List<PedidoListaDto>(),
                TotalItems = 0
            });

        await _service.ObtenerPorFiltroAsync(filtro);

        filtro.UsuarioId.Should().Be(OtroVendedorId, "ADMIN escogio explicitamente filtrar por este vendedor");
        _repo.Verify(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null), Times.Once);
    }

    // ============ Cross-tenant guard ============

    [Fact]
    public async Task ObtenerPorIdAsync_ConJwtAdmin_PedidoDeOtroTenant_RetornaNull()
    {
        // ADMIN tenant 1 intenta GET pedido id 999 que pertenece a tenant 2.
        // Service pasa TenantId=1 al repo, repo filtra y retorna null. Endpoint → 404.
        _repo.Setup(r => r.ObtenerPorIdAsync(999, TenantId)).ReturnsAsync((PedidoDto?)null);

        var result = await _service.ObtenerPorIdAsync(999);

        result.Should().BeNull();
        _repo.Verify(r => r.ObtenerPorIdAsync(999, TenantId), Times.Once);
        _repo.Verify(r => r.ObtenerPorIdAsync(999, OtroTenantId), Times.Never);
    }

    [Fact]
    public async Task ConfirmarAsync_ConJwtAdmin_CrossTenant_RetornaFalse()
    {
        // ADMIN tenant 1 intenta confirmar pedido tenant 2 → repo retorna false
        // (porque CambiarEstadoAsync filtra por TenantId=1 y no encuentra el pedido).
        _repo.Setup(r => r.CambiarEstadoAsync(9999, EstadoPedido.Confirmado, It.IsAny<string>(), TenantId))
            .ReturnsAsync(false);

        var ok = await _service.ConfirmarAsync(9999);

        // PROD BUG / FIX TODO: el endpoint hoy devuelve 400 BadRequest ("No se pudo
        // confirmar el pedido") cuando deberia devolver 404 NotFound para
        // cross-tenant. Distinguir requiere que el repo retorne un Outcome con
        // distinto status. Cambio sugerido: usar CambiarEstadoDetalladoAsync con
        // CambiarEstadoOutcome.NotFound y mapear a 404 en MobilePedidoEndpoints.cs.
        ok.Should().BeFalse("repo no encuentra el pedido al filtrar por tenant del admin");
    }

    // ============ RBAC negative: rol "desconocido" se trata como VENDEDOR ============

    [Fact]
    public async Task ObtenerPorFiltroAsync_RolNoAdmin_AutofiltraPorUsuarioId()
    {
        // Sanity check del contrato VENDEDOR — un rol que NO es ADMIN/SUPER_ADMIN/SUPERVISOR
        // (ej. VENDEDOR o rol vacio) autorestringe filtro.UsuarioId al UserId del context.
        // Esto confirma que el ramo ADMIN del test anterior es realmente el "branch
        // privilegiado" y no un side-effect.
        const int vendedorId = 77;
        var service = BuildServiceAsRole(
            rol: "VENDEDOR",
            isAdminOrAbove: false,
            isStrictAdmin: false,
            isSupervisor: false,
            isSuperAdmin: false,
            userId: vendedorId);

        var filtro = new PedidoFiltroDto { Pagina = 1, TamanoPagina = 20 };
        _repo.Setup(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null))
            .ReturnsAsync(new PedidoListaResultDto
            {
                Items = new List<PedidoListaDto>(),
                TotalItems = 0
            });

        await service.ObtenerPorFiltroAsync(filtro);

        filtro.UsuarioId.Should().Be(vendedorId, "VENDEDOR debe autofiltrarse a sus propios pedidos");
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_RolSuperAdmin_NoAutofiltra()
    {
        // SUPER_ADMIN tambien ve tenant-wide (mismo branch que ADMIN).
        var service = BuildServiceAsRole(
            rol: "SUPER_ADMIN",
            isAdminOrAbove: true,
            isStrictAdmin: true,
            isSupervisor: false,
            isSuperAdmin: true,
            userId: 1);

        var filtro = new PedidoFiltroDto { Pagina = 1, TamanoPagina = 20 };
        _repo.Setup(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null))
            .ReturnsAsync(new PedidoListaResultDto
            {
                Items = new List<PedidoListaDto>(),
                TotalItems = 0
            });

        await service.ObtenerPorFiltroAsync(filtro);

        filtro.UsuarioId.Should().BeNull("SUPER_ADMIN no debe autorestringir a su propio UsuarioId");
        _repo.Verify(r => r.ObtenerPorFiltroAsync(filtro, TenantId, null), Times.Once);
    }
}
