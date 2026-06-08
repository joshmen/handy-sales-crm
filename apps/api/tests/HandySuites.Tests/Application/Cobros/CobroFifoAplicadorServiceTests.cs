using FluentAssertions;
using HandySuites.Application.Cobranza.DTOs;
using HandySuites.Application.Cobranza.Interfaces;
using HandySuites.Application.Cobranza.Services;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Cobros;

/// <summary>
/// 2026-06-08 PR 2 plan eager-drifting cobros. Tests del algoritmo
/// de distribucion FIFO contra pedidos abiertos del cliente.
/// </summary>
public class CobroFifoAplicadorServiceTests
{
    private readonly Mock<ICobroRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly CobroFifoAplicadorService _service;

    public CobroFifoAplicadorServiceTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("42");
        _service = new CobroFifoAplicadorService(_repo.Object, _tenant.Object);
    }

    private void SetupEstadoCuenta(int clienteId, params EstadoCuentaPedidoDto[] pedidos)
    {
        _repo.Setup(r => r.ObtenerEstadoCuentaAsync(clienteId, 1, false))
            .ReturnsAsync(new EstadoCuentaDto
            {
                ClienteId = clienteId,
                ClienteNombre = "Cliente FIFO Test",
                TotalFacturado = pedidos.Sum(p => p.Total),
                TotalCobrado = pedidos.Sum(p => p.Cobrado),
                SaldoPendiente = pedidos.Sum(p => p.Saldo),
                Pedidos = pedidos.ToList(),
            });
    }

    private static EstadoCuentaPedidoDto BuildPedido(int id, string numero, decimal total, decimal cobrado, DateTime fecha)
        => new()
        {
            PedidoId = id,
            NumeroPedido = numero,
            FechaPedido = fecha,
            Total = total,
            Cobrado = cobrado,
            Saldo = total - cobrado,
            Cobros = new(),
        };

    [Fact]
    public async Task DistribuirAsync_MontoNegativo_DebeLanzar()
    {
        var act = async () => await _service.DistribuirAsync(10, -50m, 0, null, null, null);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*mayor a cero*");
    }

    [Fact]
    public async Task DistribuirAsync_ClienteNoExiste_DebeLanzar()
    {
        _repo.Setup(r => r.ObtenerEstadoCuentaAsync(99, 1, false)).ReturnsAsync((EstadoCuentaDto?)null);
        var act = async () => await _service.DistribuirAsync(99, 100m, 0, null, null, null);
        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*no existe o no pertenece*");
    }

    [Fact]
    public async Task DistribuirAsync_ClienteSinPedidosAbiertos_DebeLanzar()
    {
        // Cliente existe pero TODOS sus pedidos tienen saldo=0 (pagados completos)
        SetupEstadoCuenta(10,
            BuildPedido(100, "PED-0001", 500m, 500m, DateTime.UtcNow.AddDays(-10))); // saldo=0

        var act = async () => await _service.DistribuirAsync(10, 100m, 0, null, null, null);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*no tiene pedidos pendientes*");
    }

    [Fact]
    public async Task DistribuirAsync_MontoExcedeSaldoTotal_DebeLanzar()
    {
        SetupEstadoCuenta(10,
            BuildPedido(100, "PED-0001", 300m, 0m, DateTime.UtcNow.AddDays(-10)),
            BuildPedido(101, "PED-0002", 200m, 0m, DateTime.UtcNow.AddDays(-5)));
        // Saldo total = 500. Cliente intenta cobrar 700 → over.

        var act = async () => await _service.DistribuirAsync(10, 700m, 0, null, null, null);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*excede el saldo total*");
    }

    [Fact]
    public async Task DistribuirAsync_MontoExactoUnPedido_CreaUnSoloCobro()
    {
        SetupEstadoCuenta(10,
            BuildPedido(100, "PED-0001", 300m, 0m, DateTime.UtcNow.AddDays(-10)));
        _repo.Setup(r => r.CrearAsync(
                It.Is<CobroCreateDto>(d => d.PedidoId == 100 && d.Monto == 300m),
                1, 42)).ReturnsAsync(201);

        var result = await _service.DistribuirAsync(10, 300m, 0, null, null, null);

        result.Should().HaveCount(1);
        result[0].CobroId.Should().Be(201);
        result[0].PedidoId.Should().Be(100);
        result[0].MontoAplicado.Should().Be(300m);
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), 1, 42), Times.Once);
    }

    [Fact]
    public async Task DistribuirAsync_MontoCubre2Pedidos_DistribuyeFIFO()
    {
        // Pedido más viejo primero.
        SetupEstadoCuenta(10,
            BuildPedido(100, "PED-0001", 300m, 0m, DateTime.UtcNow.AddDays(-10)),
            BuildPedido(101, "PED-0002", 400m, 0m, DateTime.UtcNow.AddDays(-5)));
        _repo.Setup(r => r.CrearAsync(
                It.Is<CobroCreateDto>(d => d.PedidoId == 100 && d.Monto == 300m), 1, 42)).ReturnsAsync(201);
        _repo.Setup(r => r.CrearAsync(
                It.Is<CobroCreateDto>(d => d.PedidoId == 101 && d.Monto == 200m), 1, 42)).ReturnsAsync(202);

        // Cobra 500: 300 al primero, 200 al segundo
        var result = await _service.DistribuirAsync(10, 500m, 0, null, null, null);

        result.Should().HaveCount(2);
        result[0].PedidoId.Should().Be(100);
        result[0].MontoAplicado.Should().Be(300m);
        result[1].PedidoId.Should().Be(101);
        result[1].MontoAplicado.Should().Be(200m);
    }

    [Fact]
    public async Task DistribuirAsync_MontoMenorQuePrimerSaldo_AplicaParcialAlPrimer()
    {
        SetupEstadoCuenta(10,
            BuildPedido(100, "PED-0001", 1000m, 0m, DateTime.UtcNow.AddDays(-10)),
            BuildPedido(101, "PED-0002", 500m, 0m, DateTime.UtcNow.AddDays(-5)));
        _repo.Setup(r => r.CrearAsync(
                It.Is<CobroCreateDto>(d => d.PedidoId == 100 && d.Monto == 200m), 1, 42)).ReturnsAsync(201);

        var result = await _service.DistribuirAsync(10, 200m, 0, null, null, null);

        result.Should().HaveCount(1);
        result[0].PedidoId.Should().Be(100);
        result[0].MontoAplicado.Should().Be(200m);
        _repo.Verify(r => r.CrearAsync(It.IsAny<CobroCreateDto>(), 1, 42), Times.Once);
    }

    [Fact]
    public async Task DistribuirAsync_RespetaOrdenFIFOAunSiInputDesordenado()
    {
        // EstadoCuenta podria retornar pedidos en cualquier orden; el service ordena.
        SetupEstadoCuenta(10,
            BuildPedido(200, "PED-NEW", 300m, 0m, DateTime.UtcNow.AddDays(-2)), // mas reciente
            BuildPedido(100, "PED-OLD", 400m, 100m, DateTime.UtcNow.AddDays(-20)), // mas viejo, saldo=300
            BuildPedido(150, "PED-MID", 200m, 0m, DateTime.UtcNow.AddDays(-10)));
        _repo.Setup(r => r.CrearAsync(
                It.Is<CobroCreateDto>(d => d.PedidoId == 100 && d.Monto == 300m), 1, 42)).ReturnsAsync(301);
        _repo.Setup(r => r.CrearAsync(
                It.Is<CobroCreateDto>(d => d.PedidoId == 150 && d.Monto == 200m), 1, 42)).ReturnsAsync(302);
        _repo.Setup(r => r.CrearAsync(
                It.Is<CobroCreateDto>(d => d.PedidoId == 200 && d.Monto == 100m), 1, 42)).ReturnsAsync(303);

        // Cobra 600 total — debe ir 300 al viejo (PED-OLD), 200 al medio (PED-MID), 100 al nuevo (PED-NEW)
        var result = await _service.DistribuirAsync(10, 600m, 0, null, null, null);

        result.Should().HaveCount(3);
        result.Select(r => r.PedidoId).Should().Equal(100, 150, 200); // FIFO
    }
}
