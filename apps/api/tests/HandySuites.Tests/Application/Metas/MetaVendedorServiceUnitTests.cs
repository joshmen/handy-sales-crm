using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.Metas.DTOs;
using HandySuites.Application.Metas.Interfaces;
using HandySuites.Application.Metas.Services;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Metas;

public class MetaVendedorServiceUnitTests
{
    private readonly Mock<IMetaVendedorRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly MetaVendedorService _service;

    public MetaVendedorServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("1");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);
        _service = new MetaVendedorService(_repo.Object, _tenant.Object);
    }

    [Fact]
    public async Task GetAllAsync_DeberiaRetornarListaDelRepo_ConTenantActual()
    {
        // Arrange
        var expected = new List<MetaVendedorDto>
        {
            new() { Id = 1, TenantId = 1, UsuarioId = 7, Tipo = "VENTAS", Periodo = "MENSUAL", Monto = 50000m, Activo = true }
        };
        _repo.Setup(r => r.GetAllAsync(1, 7)).ReturnsAsync(expected);

        // Act
        var result = await _service.GetAllAsync(7);

        // Assert
        result.Should().BeEquivalentTo(expected);
        _repo.Verify(r => r.GetAllAsync(1, 7), Times.Once);
    }

    [Fact]
    public async Task GetByIdAsync_DeberiaRetornarNull_CuandoNoExiste()
    {
        // Arrange
        _repo.Setup(r => r.GetByIdAsync(999, 1)).ReturnsAsync((MetaVendedorDto?)null);

        // Act
        var result = await _service.GetByIdAsync(999);

        // Assert
        result.Should().BeNull();
        _repo.Verify(r => r.GetByIdAsync(999, 1), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_DeberiaRetornarIdDelRepo_ConTenantYCreadoPor()
    {
        // Arrange
        var dto = new CreateMetaVendedorDto(
            UsuarioId: 7,
            Tipo: "VENTAS",
            Periodo: "MENSUAL",
            Monto: 50000m,
            FechaInicio: new DateTime(2026, 6, 1),
            FechaFin: new DateTime(2026, 6, 30),
            AutoRenovar: false
        );
        _repo.Setup(r => r.CreateAsync(dto, "admin@test.com", 1)).ReturnsAsync(42);

        // Act
        var id = await _service.CreateAsync(dto, "admin@test.com");

        // Assert
        id.Should().Be(42);
        _repo.Verify(r => r.CreateAsync(dto, "admin@test.com", 1), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_DeberiaRetornarFalse_CuandoRepoNoEncuentra()
    {
        // Arrange
        var dto = new UpdateMetaVendedorDto(
            Tipo: "VENTAS",
            Periodo: "MENSUAL",
            Monto: 60000m,
            FechaInicio: new DateTime(2026, 6, 1),
            FechaFin: new DateTime(2026, 6, 30),
            Activo: true,
            AutoRenovar: false
        );
        _repo.Setup(r => r.UpdateAsync(123, dto, "admin@test.com", 1)).ReturnsAsync(false);

        // Act
        var result = await _service.UpdateAsync(123, dto, "admin@test.com");

        // Assert
        result.Should().BeFalse();
        _repo.Verify(r => r.UpdateAsync(123, dto, "admin@test.com", 1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_DeberiaRetornarTrue_CuandoRepoEliminaCorrectamente()
    {
        // Arrange
        _repo.Setup(r => r.DeleteAsync(5, 1)).ReturnsAsync(true);

        // Act
        var result = await _service.DeleteAsync(5);

        // Assert
        result.Should().BeTrue();
        _repo.Verify(r => r.DeleteAsync(5, 1), Times.Once);
    }

    [Fact]
    public async Task BatchToggleActivoAsync_DeberiaRetornarCantidadAfectada_ConTenantActual()
    {
        // Arrange
        var ids = new List<int> { 1, 2, 3 };
        _repo.Setup(r => r.BatchToggleActivoAsync(ids, false, 1)).ReturnsAsync(3);

        // Act
        var affected = await _service.BatchToggleActivoAsync(ids, false);

        // Assert
        affected.Should().Be(3);
        _repo.Verify(r => r.BatchToggleActivoAsync(ids, false, 1), Times.Once);
    }
}
