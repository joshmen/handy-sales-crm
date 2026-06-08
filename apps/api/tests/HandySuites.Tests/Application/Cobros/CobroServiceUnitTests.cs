using FluentAssertions;
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
using Xunit;

namespace HandySuites.Tests.Application.Cobros;

public class CobroServiceUnitTests
{
    private readonly Mock<ICobroRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<IClienteRepository> _clienteRepo = new();
    private readonly Mock<IPedidoRepository> _pedidoRepo = new();
    private readonly Mock<ISubscriptionFeatureGuard> _featureGuard = new();
    private readonly CobroService _service;

    public CobroServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("1");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        // 2026-06-08: default sin restricciones para tests existentes — los nuevos
        // tests del Modo Anticipo configuran el guard explicitamente.
        _featureGuard.Setup(g => g.RequireFeatureAsync(It.IsAny<int>(), It.IsAny<string>())).Returns(Task.CompletedTask);
        _featureGuard.Setup(g => g.HasFeatureAsync(It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(true);

        _service = new CobroService(
            _repo.Object,
            _tenant.Object,
            _clienteRepo.Object,
            _pedidoRepo.Object,
            _featureGuard.Object);
    }

    private static ClienteDto BuildCliente(int id = 10) => new()
    {
        Id = id,
        Nombre = "Cliente Test",
        RFC = "XAXX010101000",
        Correo = "cliente@test.com",
        Telefono = "5550000000",
        Direccion = "Av Siempre Viva 742",
    };

    private static PedidoDto BuildPedido(int id = 100, int clienteId = 10, EstadoPedido estado = EstadoPedido.Entregado) => new()
    {
        Id = id,
        NumeroPedido = "PED-0001",
        ClienteId = clienteId,
        ClienteNombre = "Cliente Test",
        UsuarioId = 1,
        UsuarioNombre = "Admin",
        FechaPedido = DateTime.UtcNow.AddDays(-2),
        Estado = estado,
        Total = 1000m,
    };

    // -------------------------------------------------------------------
    // 1. ObtenerCobrosAsync — vendedor: usuarioId forzado a su propio UserId
    // -------------------------------------------------------------------
    [Fact]
    public async Task ObtenerCobrosAsync_DeberiaForzarUsuarioId_CuandoEsVendedor()
    {
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(false);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.UserId).Returns("42");

        var lista = new List<CobroDto> { new() { Id = 1, ClienteNombre = "C", UsuarioNombre = "U", MetodoPagoNombre = "Ef" } };
        _repo.Setup(r => r.ObtenerCobrosAsync(1, null, null, null, 42)).ReturnsAsync(lista);

        var result = await _service.ObtenerCobrosAsync(usuarioId: 999);

        result.Should().BeEquivalentTo(lista);
        // Verificar que el repo recibió 42 (UserId del tenant), NO 999 que se pasó por parámetro
        _repo.Verify(r => r.ObtenerCobrosAsync(1, null, null, null, 42), Times.Once);
        _repo.Verify(r => r.ObtenerCobrosAsync(1, null, null, null, 999), Times.Never);
    }

    // -------------------------------------------------------------------
    // 2. ObtenerCobrosAsync — admin: respeta usuarioId del parámetro
    // -------------------------------------------------------------------
    [Fact]
    public async Task ObtenerCobrosAsync_DeberiaRespetarUsuarioIdParametro_CuandoEsAdmin()
    {
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.UserId).Returns("1");

        var lista = new List<CobroDto>();
        _repo.Setup(r => r.ObtenerCobrosAsync(1, null, null, null, 5)).ReturnsAsync(lista);

        var result = await _service.ObtenerCobrosAsync(usuarioId: 5);

        result.Should().BeSameAs(lista);
        _repo.Verify(r => r.ObtenerCobrosAsync(1, null, null, null, 5), Times.Once);
    }

    // -------------------------------------------------------------------
    // 3. ObtenerPorIdAsync — passthrough simple
    // -------------------------------------------------------------------
    [Fact]
    public async Task ObtenerPorIdAsync_DeberiaRetornarCobro_CuandoExiste()
    {
        var cobro = new CobroDto
        {
            Id = 7,
            ClienteNombre = "C",
            UsuarioNombre = "U",
            MetodoPagoNombre = "Efectivo",
            Monto = 500m,
        };
        _repo.Setup(r => r.ObtenerPorIdAsync(7, 1)).ReturnsAsync(cobro);

        var result = await _service.ObtenerPorIdAsync(7);

        result.Should().NotBeNull();
        result!.Id.Should().Be(7);
        result.Monto.Should().Be(500m);
    }

    // -------------------------------------------------------------------
    // 4. CrearAsync — monto <= 0 debe lanzar
    // 2026-06-08: agregado PedidoId valido para pasar la nueva validacion Modo=PorPedido.
    // -------------------------------------------------------------------
    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoMontoEsCeroOnegativo()
    {
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 0m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*mayor a cero*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    // -------------------------------------------------------------------
    // 5. CrearAsync — cliente no pertenece al tenant
    // 2026-06-08: agregado PedidoId valido para pasar Modo=PorPedido check.
    // -------------------------------------------------------------------
    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoClienteNoPerteneceAlTenant()
    {
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 200m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        _clienteRepo.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync((ClienteDto?)null);

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*no existe o no pertenece*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    // -------------------------------------------------------------------
    // 6. CrearAsync — pedido no pertenece al cliente
    // -------------------------------------------------------------------
    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoPedidoNoPerteneceAlCliente()
    {
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 200m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        _clienteRepo.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync(BuildCliente(10));
        // Pedido con ClienteId diferente al dto.ClienteId
        _pedidoRepo.Setup(r => r.ObtenerPorIdAsync(100, 1)).ReturnsAsync(BuildPedido(100, clienteId: 99));

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*no pertenece al cliente*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    // -------------------------------------------------------------------
    // 7. CrearAsync — pedido cancelado no se puede cobrar
    // -------------------------------------------------------------------
    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoPedidoEstaCancelado()
    {
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 200m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        _clienteRepo.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync(BuildCliente(10));
        _pedidoRepo.Setup(r => r.ObtenerPorIdAsync(100, 1))
            .ReturnsAsync(BuildPedido(100, clienteId: 10, estado: EstadoPedido.Cancelado));

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cancelado*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    // -------------------------------------------------------------------
    // 8. CrearAsync — pedido en borrador no se puede cobrar
    // -------------------------------------------------------------------
    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoPedidoEstaEnBorrador()
    {
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 200m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null);

        _clienteRepo.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync(BuildCliente(10));
        _pedidoRepo.Setup(r => r.ObtenerPorIdAsync(100, 1))
            .ReturnsAsync(BuildPedido(100, clienteId: 10, estado: EstadoPedido.Borrador));

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*borrador*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    // -------------------------------------------------------------------
    // 9. CrearAsync — fecha futura debe lanzar
    // 2026-06-08: agregado PedidoId + setup pedido para pasar Modo=PorPedido check.
    // -------------------------------------------------------------------
    [Fact]
    public async Task CrearAsync_DeberiaLanzar_CuandoFechaCobroEsFutura()
    {
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 200m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow.AddDays(5),
            Referencia: null,
            Notas: null);

        _clienteRepo.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync(BuildCliente(10));
        _pedidoRepo.Setup(r => r.ObtenerPorIdAsync(100, 1))
            .ReturnsAsync(BuildPedido(100, clienteId: 10, estado: EstadoPedido.Entregado));

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*futura*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    // -------------------------------------------------------------------
    // 10. CrearAsync — happy path: cliente + pedido válidos → retorna Id
    // -------------------------------------------------------------------
    [Fact]
    public async Task CrearAsync_DeberiaRetornarId_CuandoTodoEsValido()
    {
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 500m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: "REF-001",
            Notas: "Cobro de prueba");

        _clienteRepo.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync(BuildCliente(10));
        _pedidoRepo.Setup(r => r.ObtenerPorIdAsync(100, 1))
            .ReturnsAsync(BuildPedido(100, clienteId: 10, estado: EstadoPedido.Entregado));
        _repo.Setup(r => r.CrearAsync(dto, 1, 1)).ReturnsAsync(99);

        var result = await _service.CrearAsync(dto);

        result.Should().Be(99);
        _repo.Verify(r => r.CrearAsync(dto, 1, 1), Times.Once);
    }

    // ─── 2026-06-08: Nuevos tests para Modo explicito (PR 1 plan eager-drifting) ───

    [Fact]
    public async Task CrearAsync_ModoPorPedido_SinPedidoId_DebeLanzar()
    {
        // El modo default es PorPedido — sin PedidoId es incoherente.
        var dto = new CobroCreateDto(
            PedidoId: null,
            ClienteId: 10,
            Monto: 200m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null,
            Modo: ModoCobroDto.PorPedido);

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*requiere seleccionar un pedido*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_ModoAbonoFifo_SinFifoServiceInyectado_DebeLanzar()
    {
        // PR 2 plan: si DI no registra ICobroFifoAplicadorService, modo FIFO falla
        // con mensaje claro. Test del fallback defensivo.
        var serviceSinFifo = new CobroService(
            _repo.Object, _tenant.Object, _clienteRepo.Object, _pedidoRepo.Object, _featureGuard.Object,
            fifoAplicador: null);
        var dto = new CobroCreateDto(
            PedidoId: null,
            ClienteId: 10,
            Monto: 200m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null,
            Modo: ModoCobroDto.AbonoFifo);

        var act = async () => await serviceSinFifo.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*no esta disponible*");
    }

    [Fact]
    public async Task CrearAsync_ModoAbonoFifo_ConPedidoId_DebeLanzar()
    {
        // FIFO distribuye automaticamente — incoherente con pedido especifico.
        var fifo = new Mock<ICobroFifoAplicadorService>();
        var service = new CobroService(
            _repo.Object, _tenant.Object, _clienteRepo.Object, _pedidoRepo.Object, _featureGuard.Object,
            fifoAplicador: fifo.Object);
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 200m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null,
            Modo: ModoCobroDto.AbonoFifo);

        var act = async () => await service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*no debe llevar pedido*");
        fifo.Verify(f => f.DistribuirAsync(It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_ModoAbonoFifo_HappyPath_DelegaAFifoYRetornaPrimerCobroId()
    {
        var fifo = new Mock<ICobroFifoAplicadorService>();
        fifo.Setup(f => f.DistribuirAsync(10, 500m, 0, It.IsAny<DateTime?>(), null, "Pago multiple"))
            .ReturnsAsync(new List<FifoAplicacionDto>
            {
                new(CobroId: 201, PedidoId: 100, NumeroPedido: "PED-0001", MontoAplicado: 300m),
                new(CobroId: 202, PedidoId: 101, NumeroPedido: "PED-0002", MontoAplicado: 200m),
            });

        var service = new CobroService(
            _repo.Object, _tenant.Object, _clienteRepo.Object, _pedidoRepo.Object, _featureGuard.Object,
            fifoAplicador: fifo.Object);
        var dto = new CobroCreateDto(
            PedidoId: null,
            ClienteId: 10,
            Monto: 500m,
            MetodoPago: 0,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: "Pago multiple",
            Modo: ModoCobroDto.AbonoFifo);

        var result = await service.CrearAsync(dto);

        result.Should().Be(201);
        fifo.Verify(f => f.DistribuirAsync(10, 500m, 0, It.IsAny<DateTime?>(), null, "Pago multiple"), Times.Once);
    }

    [Fact]
    public async Task CrearFifoAsync_HappyPath_RetornaListaCompleta()
    {
        var fifo = new Mock<ICobroFifoAplicadorService>();
        var lista = new List<FifoAplicacionDto>
        {
            new(201, 100, "PED-0001", 300m),
            new(202, 101, "PED-0002", 200m),
        };
        fifo.Setup(f => f.DistribuirAsync(10, 500m, 0, It.IsAny<DateTime?>(), null, null))
            .ReturnsAsync(lista);

        _clienteRepo.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync(BuildCliente(10));

        var service = new CobroService(
            _repo.Object, _tenant.Object, _clienteRepo.Object, _pedidoRepo.Object, _featureGuard.Object,
            fifoAplicador: fifo.Object);
        var dto = new CobroCreateDto(
            PedidoId: null, ClienteId: 10, Monto: 500m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null,
            Modo: ModoCobroDto.AbonoFifo);

        var result = await service.CrearFifoAsync(dto);

        result.Should().BeEquivalentTo(lista);
    }

    [Fact]
    public async Task CrearFifoAsync_ModoIncorrecto_DebeLanzar()
    {
        var service = new CobroService(
            _repo.Object, _tenant.Object, _clienteRepo.Object, _pedidoRepo.Object, _featureGuard.Object,
            fifoAplicador: Mock.Of<ICobroFifoAplicadorService>());
        var dto = new CobroCreateDto(
            PedidoId: 100, ClienteId: 10, Monto: 100m, MetodoPago: 0,
            FechaCobro: DateTime.UtcNow, Referencia: null, Notas: null,
            Modo: ModoCobroDto.PorPedido);

        var act = async () => await service.CrearFifoAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Modo=AbonoFifo*");
    }

    [Fact]
    public async Task CrearAsync_ModoAnticipo_SinFeatureFlag_DebeLanzarFeatureNotInPlan()
    {
        // Plan SIN PermitirAnticiposEnCampo: rechazar con FeatureNotInPlanException.
        _featureGuard.Setup(g => g.RequireFeatureAsync(1, CobroService.FeatureAnticiposEnCampo))
            .ThrowsAsync(new FeatureNotInPlanException(CobroService.FeatureAnticiposEnCampo));

        var dto = new CobroCreateDto(
            PedidoId: null,
            ClienteId: 10,
            Monto: 500m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null,
            Modo: ModoCobroDto.Anticipo);

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<FeatureNotInPlanException>();
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_ModoAnticipo_ConPedidoId_DebeLanzar()
    {
        // Anticipo NO debe llevar PedidoId — genera saldoFavor, no aplica a pedido.
        var dto = new CobroCreateDto(
            PedidoId: 100,
            ClienteId: 10,
            Monto: 500m,
            MetodoPago: 1,
            FechaCobro: DateTime.UtcNow,
            Referencia: null,
            Notas: null,
            Modo: ModoCobroDto.Anticipo);

        var act = async () => await _service.CrearAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*no debe llevar pedido especifico*");
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task CrearAsync_ModoAnticipo_HappyPath_DebeRetornarId()
    {
        // Plan permite anticipos + dto coherente → cobro creado.
        var dto = new CobroCreateDto(
            PedidoId: null,
            ClienteId: 10,
            Monto: 750m,
            MetodoPago: 0, // Efectivo
            FechaCobro: DateTime.UtcNow,
            Referencia: "ANTICIPO-001",
            Notas: "Abono anticipado",
            Modo: ModoCobroDto.Anticipo);

        _clienteRepo.Setup(r => r.ObtenerPorIdAsync(10, 1)).ReturnsAsync(BuildCliente(10));
        _repo.Setup(r => r.CrearAsync(dto, 1, 1)).ReturnsAsync(123);

        var result = await _service.CrearAsync(dto);

        result.Should().Be(123);
        _featureGuard.Verify(g => g.RequireFeatureAsync(1, CobroService.FeatureAnticiposEnCampo), Times.Once);
        _repo.Verify(r => r.CrearAsync(dto, 1, 1), Times.Once);
    }
}
