using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Inventario.Interfaces;
using HandySuites.Application.MovimientosInventario.Interfaces;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Application.Pedidos.DTOs;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Application.Pedidos.Services;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Pedidos;

/// <summary>
/// Unit tests puros para <see cref="PedidoService"/>.
///
/// MovimientoInventarioService es una clase concreta (no interfaz). Para los tests
/// que NO ejercen la rama VentaDirecta basta con instanciarla con sus dependencias
/// mockeadas; los tests que la ejercen tambien la instancian con mocks y configuran
/// el comportamiento esperado.
/// </summary>
public class PedidoServiceUnitTests
{
    private readonly Mock<IPedidoRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<IUsuarioRepository> _usuarioRepo = new();
    private readonly Mock<ITransactionManager> _transactions = new();

    // Dependencias de MovimientoInventarioService (clase concreta).
    private readonly Mock<IMovimientoInventarioRepository> _movRepo = new();
    private readonly Mock<IInventarioRepository> _invRepo = new();
    private readonly Mock<ITransactionManager> _movTransactions = new();
    private readonly MovimientoInventarioService _movimientoService;

    private readonly PedidoService _service;

    public PedidoServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("10");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdmin).Returns(true);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        // Transaccion: ejecuta la lambda directamente.
        _transactions
            .Setup(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task<int>>>()))
            .Returns<Func<Task<int>>>(f => f());
        _movTransactions
            .Setup(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task<(int, bool, string?)>>>()))
            .Returns<Func<Task<(int, bool, string?)>>>(f => f());

        _movimientoService = new MovimientoInventarioService(
            _movRepo.Object,
            _invRepo.Object,
            _tenant.Object,
            _movTransactions.Object);

        _service = new PedidoService(
            _repo.Object,
            _tenant.Object,
            _usuarioRepo.Object,
            _movimientoService,
            _transactions.Object);
    }

    private static PedidoCreateDto NuevoDto(
        TipoVenta tipoVenta = TipoVenta.Preventa,
        List<DetallePedidoCreateDto>? detalles = null,
        int? listaPrecioId = null)
    {
        return new PedidoCreateDto
        {
            ClienteId = 100,
            TipoVenta = tipoVenta,
            ListaPrecioId = listaPrecioId,
            Detalles = detalles ?? new List<DetallePedidoCreateDto>
            {
                new() { ProductoId = 1, Cantidad = 2, PrecioUnitario = 50m }
            }
        };
    }

    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoClienteInactivo()
    {
        _repo.Setup(r => r.ClienteActivoAsync(100, 1)).ReturnsAsync(false);

        var act = async () => await _service.CrearAsync(NuevoDto());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*desactivado*");
    }

    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoListaPrecioNoExiste()
    {
        _repo.Setup(r => r.ClienteActivoAsync(100, 1)).ReturnsAsync(true);
        _repo.Setup(r => r.ExisteListaPrecioAsync(999, 1)).ReturnsAsync(false);

        var act = async () => await _service.CrearAsync(NuevoDto(listaPrecioId: 999));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*lista de precios*");
    }

    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoDetallesDuplicados()
    {
        _repo.Setup(r => r.ClienteActivoAsync(100, 1)).ReturnsAsync(true);
        var detalles = new List<DetallePedidoCreateDto>
        {
            new() { ProductoId = 5, Cantidad = 1, PrecioUnitario = 10m },
            new() { ProductoId = 5, Cantidad = 2, PrecioUnitario = 10m }
        };

        var act = async () => await _service.CrearAsync(NuevoDto(detalles: detalles));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*duplicados*");
    }

    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoProductoInactivo()
    {
        _repo.Setup(r => r.ClienteActivoAsync(100, 1)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(1, 1)).ReturnsAsync(false);

        var act = async () => await _service.CrearAsync(NuevoDto());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*producto*desactivado*");
    }

    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoDescuentoExcedeSubtotal()
    {
        _repo.Setup(r => r.ClienteActivoAsync(100, 1)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(It.IsAny<int>(), 1)).ReturnsAsync(true);
        var detalles = new List<DetallePedidoCreateDto>
        {
            // subtotal = 2 * 50 = 100, descuento 150 > 100.
            new() { ProductoId = 1, Cantidad = 2, PrecioUnitario = 50m, Descuento = 150m }
        };

        var act = async () => await _service.CrearAsync(NuevoDto(detalles: detalles));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*descuento*excede*subtotal*");
    }

    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoStockInsuficienteEnVentaDirecta()
    {
        _repo.Setup(r => r.ClienteActivoAsync(100, 1)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(It.IsAny<int>(), 1)).ReturnsAsync(true);
        // Cantidad requerida = 2; stock disponible = 1.
        _repo.Setup(r => r.ObtenerStockDisponibleAsync(1, 1)).ReturnsAsync(1m);
        _repo.Setup(r => r.ObtenerNombreProductoAsync(1, 1)).ReturnsAsync("Producto X");

        var act = async () => await _service.CrearAsync(NuevoDto(tipoVenta: TipoVenta.VentaDirecta));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Stock insuficiente*");
    }

    [Fact]
    public async Task CrearAsync_DeberiaRetornarPedidoId_CuandoTodoValido()
    {
        _repo.Setup(r => r.ClienteActivoAsync(100, 1)).ReturnsAsync(true);
        _repo.Setup(r => r.ProductoActivoAsync(It.IsAny<int>(), 1)).ReturnsAsync(true);
        _repo.Setup(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), 10, 1)).ReturnsAsync(42);

        var result = await _service.CrearAsync(NuevoDto());

        result.Should().Be(42);
        _transactions.Verify(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task<int>>>()), Times.Once);
        _repo.Verify(r => r.CrearAsync(It.IsAny<PedidoCreateDto>(), 10, 1), Times.Once);
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_DeberiaFiltrarPorSubordinados_CuandoSupervisor()
    {
        _tenant.SetupGet(t => t.IsAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(true);
        _tenant.SetupGet(t => t.UserId).Returns("7");
        _tenant.SetupGet(t => t.Role).Returns("SUPERVISOR");

        var subs = new List<int> { 11, 12, 13 };
        _usuarioRepo.Setup(u => u.ObtenerSubordinadoIdsAsync(7, 1)).ReturnsAsync(subs);

        var expected = new PaginatedResult<PedidoListaDto>
        {
            Items = new(), TotalItems = 0, Pagina = 1, TamanoPagina = 20
        };
        _repo.Setup(r => r.ObtenerPorFiltroAsync(
                It.IsAny<PedidoFiltroDto>(),
                1,
                It.Is<List<int>?>(l => l != null && l.Contains(7) && l.Contains(11) && l.Contains(12) && l.Contains(13))))
            .ReturnsAsync(expected);

        var filtro = new PedidoFiltroDto();
        var result = await _service.ObtenerPorFiltroAsync(filtro);

        result.Should().BeSameAs(expected);
        _usuarioRepo.Verify(u => u.ObtenerSubordinadoIdsAsync(7, 1), Times.Once);
        _repo.Verify(r => r.ObtenerPorFiltroAsync(
            It.IsAny<PedidoFiltroDto>(),
            1,
            It.Is<List<int>?>(l => l != null && l.Count == 4)), Times.Once);
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_DeberiaForzarUsuarioIdPropio_CuandoVendedor()
    {
        _tenant.SetupGet(t => t.IsAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);
        _tenant.SetupGet(t => t.UserId).Returns("55");
        _tenant.SetupGet(t => t.Role).Returns("VENDEDOR");

        var expected = new PaginatedResult<PedidoListaDto>
        {
            Items = new(), TotalItems = 0, Pagina = 1, TamanoPagina = 20
        };
        _repo.Setup(r => r.ObtenerPorFiltroAsync(
                It.Is<PedidoFiltroDto>(f => f.UsuarioId == 55),
                1,
                null))
            .ReturnsAsync(expected);

        // Aunque el filtro intente pasar otro UsuarioId, debe forzarse al vendedor.
        var filtro = new PedidoFiltroDto { UsuarioId = 999 };
        var result = await _service.ObtenerPorFiltroAsync(filtro);

        result.Should().BeSameAs(expected);
        filtro.UsuarioId.Should().Be(55);
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_DeberiaSanitizarPaginacion_CuandoValoresInvalidos()
    {
        // Admin path (sin forzado de UsuarioId, sin lookup de subordinados).
        var expected = new PaginatedResult<PedidoListaDto>
        {
            Items = new(), TotalItems = 0, Pagina = 1, TamanoPagina = 200
        };
        _repo.Setup(r => r.ObtenerPorFiltroAsync(
                It.IsAny<PedidoFiltroDto>(), 1, null))
            .ReturnsAsync(expected);

        var filtro = new PedidoFiltroDto { Pagina = -1, TamanoPagina = 500 };
        await _service.ObtenerPorFiltroAsync(filtro);

        filtro.Pagina.Should().Be(1);
        filtro.TamanoPagina.Should().Be(200);
    }

    [Fact]
    public async Task ActualizarAsync_DeberiaLanzar_CuandoDetallesDuplicados()
    {
        var dto = new PedidoUpdateDto
        {
            Detalles = new List<DetallePedidoCreateDto>
            {
                new() { ProductoId = 8, Cantidad = 1 },
                new() { ProductoId = 8, Cantidad = 3 }
            }
        };

        var act = async () => await _service.ActualizarAsync(50, dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*duplicados*");
    }

    [Fact]
    public async Task ConfirmarAsync_DeberiaInvocarRepoConEstadoConfirmado()
    {
        _repo.Setup(r => r.CambiarEstadoAsync(77, EstadoPedido.Confirmado, It.IsAny<string?>(), 1))
            .ReturnsAsync(true);

        var result = await _service.ConfirmarAsync(77);

        result.Should().BeTrue();
        _repo.Verify(r => r.CambiarEstadoAsync(77, EstadoPedido.Confirmado, It.IsAny<string?>(), 1), Times.Once);
    }
}
