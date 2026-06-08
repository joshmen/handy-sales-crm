using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Inventario.DTOs;
using HandySuites.Application.Inventario.Interfaces;
using HandySuites.Application.MovimientosInventario.DTOs;
using HandySuites.Application.MovimientosInventario.Interfaces;
using HandySuites.Application.MovimientosInventario.Services;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.MovimientosInventario;

public class MovimientoInventarioServiceUnitTests
{
    private readonly Mock<IMovimientoInventarioRepository> _movimientoRepo = new();
    private readonly Mock<IInventarioRepository> _inventarioRepo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<ITransactionManager> _tx = new();
    private readonly MovimientoInventarioService _service;

    public MovimientoInventarioServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("1");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);

        // Pass-through transaction manager: simply invoke the supplied delegate
        _tx.Setup(x => x.ExecuteInTransactionAsync(It.IsAny<Func<Task<(int, bool, string?)>>>()))
            .Returns<Func<Task<(int, bool, string?)>>>(f => f());

        _service = new MovimientoInventarioService(
            _movimientoRepo.Object,
            _inventarioRepo.Object,
            _tenant.Object,
            _tx.Object);
    }

    [Fact]
    public async Task ObtenerPorFiltroAsync_DeberiaRetornarPaginado_CuandoFiltroValido()
    {
        // Arrange
        var filtro = new MovimientoInventarioFiltroDto { Pagina = 1, TamanoPagina = 10 };
        var expected = new MovimientoInventarioPaginadoDto
        {
            Items = new List<MovimientoInventarioListaDto>
            {
                new() { Id = 1, ProductoId = 100, TipoMovimiento = "ENTRADA", Cantidad = 5 }
            },
            TotalItems = 1,
            Pagina = 1,
            TamanoPagina = 10,
            TotalPaginas = 1
        };
        _movimientoRepo
            .Setup(r => r.ObtenerPorFiltroAsync(filtro, 1))
            .ReturnsAsync(expected);

        // Act
        var result = await _service.ObtenerPorFiltroAsync(filtro);

        // Assert
        result.Should().BeSameAs(expected);
        _movimientoRepo.Verify(r => r.ObtenerPorFiltroAsync(filtro, 1), Times.Once);
    }

    [Fact]
    public async Task ObtenerPorIdAsync_DeberiaRetornarNull_CuandoNoExiste()
    {
        // Arrange
        _movimientoRepo
            .Setup(r => r.ObtenerPorIdAsync(999, 1))
            .ReturnsAsync((MovimientoInventarioDto?)null);

        // Act
        var result = await _service.ObtenerPorIdAsync(999);

        // Assert
        result.Should().BeNull();
        _movimientoRepo.Verify(r => r.ObtenerPorIdAsync(999, 1), Times.Once);
    }

    [Fact]
    public async Task ObtenerPorProductoAsync_DeberiaRetornarLista_ConLimiteCustom()
    {
        // Arrange
        var expected = new List<MovimientoInventarioListaDto>
        {
            new() { Id = 1, ProductoId = 100, TipoMovimiento = "ENTRADA", Cantidad = 5 },
            new() { Id = 2, ProductoId = 100, TipoMovimiento = "SALIDA", Cantidad = 2 }
        };
        _movimientoRepo
            .Setup(r => r.ObtenerPorProductoAsync(100, 1, 25))
            .ReturnsAsync(expected);

        // Act
        var result = await _service.ObtenerPorProductoAsync(100, 25);

        // Assert
        result.Should().BeEquivalentTo(expected);
        _movimientoRepo.Verify(r => r.ObtenerPorProductoAsync(100, 1, 25), Times.Once);
    }

    [Fact]
    public async Task CrearMovimientoAsync_DeberiaRetornarError_CuandoTipoInvalido()
    {
        // Arrange
        var dto = new MovimientoInventarioCreateDto
        {
            ProductoId = 100,
            TipoMovimiento = "TRANSFERENCIA",
            Cantidad = 5
        };

        // Act
        var (movimientoId, success, error) = await _service.CrearMovimientoAsync(dto);

        // Assert
        movimientoId.Should().Be(0);
        success.Should().BeFalse();
        error.Should().Contain("Tipo de movimiento inválido");

        // El servicio NO debe entrar al transaction manager cuando el tipo es invalido
        _tx.Verify(x => x.ExecuteInTransactionAsync(It.IsAny<Func<Task<(int, bool, string?)>>>()), Times.Never);
        _inventarioRepo.Verify(r => r.AcquireProductoLockAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
        _movimientoRepo.Verify(
            r => r.CrearAsync(It.IsAny<MovimientoInventarioCreateDto>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<decimal>()),
            Times.Never);
    }

    [Fact]
    public async Task CrearMovimientoAsync_DeberiaRetornarError_CuandoNoExisteInventario()
    {
        // Arrange
        var dto = new MovimientoInventarioCreateDto
        {
            ProductoId = 100,
            TipoMovimiento = "ENTRADA",
            Cantidad = 5
        };
        _inventarioRepo
            .Setup(r => r.AcquireProductoLockAsync(1, 100))
            .Returns(Task.CompletedTask);
        _inventarioRepo
            .Setup(r => r.ObtenerPorProductoIdAsync(100, 1))
            .ReturnsAsync((InventarioDto?)null);

        // Act
        var (movimientoId, success, error) = await _service.CrearMovimientoAsync(dto);

        // Assert
        movimientoId.Should().Be(0);
        success.Should().BeFalse();
        error.Should().Contain("No existe inventario");

        _inventarioRepo.Verify(r => r.AcquireProductoLockAsync(1, 100), Times.Once);
        _movimientoRepo.Verify(
            r => r.CrearAsync(It.IsAny<MovimientoInventarioCreateDto>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<decimal>()),
            Times.Never);
    }

    [Fact]
    public async Task CrearMovimientoAsync_DeberiaRetornarError_CuandoStockInsuficienteEnSalida()
    {
        // Arrange
        var dto = new MovimientoInventarioCreateDto
        {
            ProductoId = 100,
            TipoMovimiento = "SALIDA",
            Cantidad = 10
        };
        var inventario = new InventarioDto
        {
            Id = 50,
            ProductoId = 100,
            CantidadActual = 5,
            StockMinimo = 1,
            StockMaximo = 100
        };
        _inventarioRepo
            .Setup(r => r.AcquireProductoLockAsync(1, 100))
            .Returns(Task.CompletedTask);
        _inventarioRepo
            .Setup(r => r.ObtenerPorProductoIdAsync(100, 1))
            .ReturnsAsync(inventario);

        // Act
        var (movimientoId, success, error) = await _service.CrearMovimientoAsync(dto);

        // Assert
        movimientoId.Should().Be(0);
        success.Should().BeFalse();
        error.Should().Contain("Stock insuficiente");

        // Asegurar que no se actualizo el inventario ni se creo el movimiento
        _inventarioRepo.Verify(
            r => r.ActualizarAsync(It.IsAny<int>(), It.IsAny<InventarioUpdateDto>(), It.IsAny<int>()),
            Times.Never);
        _movimientoRepo.Verify(
            r => r.CrearAsync(It.IsAny<MovimientoInventarioCreateDto>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<decimal>()),
            Times.Never);
    }

    [Fact]
    public async Task CrearMovimientoAsync_DeberiaCrearMovimiento_CuandoEntradaValida()
    {
        // Arrange
        var dto = new MovimientoInventarioCreateDto
        {
            ProductoId = 100,
            TipoMovimiento = "ENTRADA",
            Cantidad = 5
        };
        var inventario = new InventarioDto
        {
            Id = 50,
            ProductoId = 100,
            CantidadActual = 10,
            StockMinimo = 1,
            StockMaximo = 100
        };
        _inventarioRepo
            .Setup(r => r.AcquireProductoLockAsync(1, 100))
            .Returns(Task.CompletedTask);
        _inventarioRepo
            .Setup(r => r.ObtenerPorProductoIdAsync(100, 1))
            .ReturnsAsync(inventario);
        _inventarioRepo
            .Setup(r => r.ActualizarAsync(50, It.Is<InventarioUpdateDto>(u => u.CantidadActual == 15m), 1))
            .ReturnsAsync(true);
        _movimientoRepo
            .Setup(r => r.CrearAsync(dto, 1, 1, 10m, 15m))
            .ReturnsAsync(42);

        // Act
        var (movimientoId, success, error) = await _service.CrearMovimientoAsync(dto);

        // Assert
        movimientoId.Should().Be(42);
        success.Should().BeTrue();
        error.Should().BeNull();

        _inventarioRepo.Verify(
            r => r.ActualizarAsync(50, It.Is<InventarioUpdateDto>(u => u.CantidadActual == 15m && u.StockMinimo == 1m && u.StockMaximo == 100m), 1),
            Times.Once);
        _movimientoRepo.Verify(r => r.CrearAsync(dto, 1, 1, 10m, 15m), Times.Once);
    }

    [Fact]
    public async Task CrearMovimientoAsync_DeberiaLanzarException_CuandoActualizarFalla()
    {
        // Arrange
        var dto = new MovimientoInventarioCreateDto
        {
            ProductoId = 100,
            TipoMovimiento = "AJUSTE",
            Cantidad = 7
        };
        var inventario = new InventarioDto
        {
            Id = 50,
            ProductoId = 100,
            CantidadActual = 10,
            StockMinimo = 1,
            StockMaximo = 100
        };
        _inventarioRepo
            .Setup(r => r.AcquireProductoLockAsync(1, 100))
            .Returns(Task.CompletedTask);
        _inventarioRepo
            .Setup(r => r.ObtenerPorProductoIdAsync(100, 1))
            .ReturnsAsync(inventario);
        _inventarioRepo
            .Setup(r => r.ActualizarAsync(50, It.IsAny<InventarioUpdateDto>(), 1))
            .ReturnsAsync(false);

        // Act
        Func<Task> act = async () => await _service.CrearMovimientoAsync(dto);

        // Assert
        await act.Should()
            .ThrowAsync<InvalidOperationException>()
            .WithMessage("Error al actualizar el inventario");

        _movimientoRepo.Verify(
            r => r.CrearAsync(It.IsAny<MovimientoInventarioCreateDto>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<decimal>()),
            Times.Never);
    }
}
