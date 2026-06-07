using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Rutas.DTOs;
using HandySuites.Application.Rutas.Interfaces;
using HandySuites.Application.Rutas.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Rutas;

/// <summary>
/// Unit tests puros para <see cref="RutaVendedorService"/>. No usan
/// CustomWebApplicationFactory ni InMemory DB — todos los colaboradores son
/// mocks de Moq. Cubre: happy path, validacion (no encontrada / estado invalido),
/// RBAC (vendedor vs admin/super/supervisor) y aislamiento cross-tenant.
/// </summary>
public class RutaVendedorServiceUnitTests
{
    private const int Tenant = 1;
    private const int AdminUserId = 1;
    private const int VendedorUserId = 42;

    private readonly Mock<IRutaVendedorRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<ITransactionManager> _tx = new();

    public RutaVendedorServiceUnitTests()
    {
        // Default: Admin estricto del tenant 1 con UserId=1. Tests que necesiten
        // un vendedor o super_admin re-configuran estos setups.
        _tenant.SetupGet(t => t.TenantId).Returns(Tenant);
        _tenant.SetupGet(t => t.UserId).Returns(AdminUserId.ToString());
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);

        // Transaction manager: ejecuta el delegate inline (sin transaccion real).
        _tx.Setup(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task<int>>>()))
            .Returns<Func<Task<int>>>(f => f());
        _tx.Setup(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task<bool>>>()))
            .Returns<Func<Task<bool>>>(f => f());
    }

    private RutaVendedorService BuildService() =>
        new(_repo.Object, _tenant.Object, _tx.Object);

    private void ConfigureVendedor(int vendedorId = VendedorUserId)
    {
        _tenant.SetupGet(t => t.UserId).Returns(vendedorId.ToString());
        _tenant.SetupGet(t => t.Role).Returns("VENDEDOR");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(false);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSuperAdmin).Returns(false);
        _tenant.SetupGet(t => t.IsSupervisor).Returns(false);
    }

    // ===== 1. CrearAsync — Happy path admin =====

    [Fact]
    public async Task CrearAsync_DeberiaCrearRuta_CuandoAdminYDatosValidos()
    {
        // Arrange: admin crea ruta para vendedor 42, zona 7. Existence checks pasan.
        var dto = new RutaVendedorCreateDto
        {
            UsuarioId = VendedorUserId,
            ZonaId = 7,
            Nombre = "Ruta Lunes",
            Fecha = new DateTime(2026, 6, 7),
            EsTemplate = false,
        };
        _repo.Setup(r => r.ExisteUsuarioEnTenantAsync(VendedorUserId, Tenant)).ReturnsAsync(true);
        _repo.Setup(r => r.ExisteZonaEnTenantAsync(7, Tenant)).ReturnsAsync(true);
        _repo.Setup(r => r.GenerarCodigoRutaAsync(Tenant, dto.Fecha.Date, false))
            .ReturnsAsync("RT-20260607-0001");
        _repo.Setup(r => r.CrearAsync(It.IsAny<RutaVendedor>())).ReturnsAsync(100);
        _repo.Setup(r => r.ReemplazarZonasAsync(100, It.IsAny<List<int>>(), Tenant))
            .Returns(Task.CompletedTask);
        var service = BuildService();

        // Act
        var id = await service.CrearAsync(dto);

        // Assert
        id.Should().Be(100);
        _repo.Verify(r => r.CrearAsync(It.Is<RutaVendedor>(
            ruta => ruta.TenantId == Tenant
                 && ruta.UsuarioId == VendedorUserId
                 && ruta.Codigo == "RT-20260607-0001"
                 && ruta.Estado == EstadoRuta.Planificada)), Times.Once);
        _tx.Verify(t => t.ExecuteInTransactionAsync(It.IsAny<Func<Task<int>>>()), Times.Once);
    }

    // ===== 2. CrearAsync — RBAC vendedor no puede asignar a otro =====

    [Fact]
    public async Task CrearAsync_DeberiaLanzarUnauthorized_CuandoVendedorAsignaAOtroUsuario()
    {
        // Arrange: vendedor con UserId=42 intenta crear ruta asignada a usuario 99.
        ConfigureVendedor(VendedorUserId);
        var dto = new RutaVendedorCreateDto
        {
            UsuarioId = 99,
            Nombre = "Ruta ajena",
            Fecha = DateTime.UtcNow.Date,
            EsTemplate = false,
        };
        var service = BuildService();

        // Act
        var act = async () => await service.CrearAsync(dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repo.Verify(r => r.CrearAsync(It.IsAny<RutaVendedor>()), Times.Never);
    }

    // ===== 3. ObtenerPorIdAsync — Cross-tenant bloqueo =====

    [Fact]
    public async Task ObtenerPorIdAsync_DeberiaLanzarUnauthorized_CuandoOtroTenant()
    {
        // Arrange: admin del tenant 1 pide ruta del tenant 2.
        _repo.Setup(r => r.ObtenerPorIdAsync(50)).ReturnsAsync(new RutaVendedorDto { Id = 50 });
        _repo.Setup(r => r.ObtenerEntidadAsync(50)).ReturnsAsync(new RutaVendedor
        {
            Id = 50,
            TenantId = 2, // otro tenant
            UsuarioId = AdminUserId,
            Estado = EstadoRuta.Planificada,
        });
        var service = BuildService();

        // Act
        var act = async () => await service.ObtenerPorIdAsync(50);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ===== 4. ActualizarAsync — Estado no Planificada bloquea edicion =====

    [Fact]
    public async Task ActualizarAsync_DeberiaLanzarInvalidOperation_CuandoRutaNoPlanificada()
    {
        // Arrange: ruta en EnProgreso — solo se permite editar Planificada.
        _repo.Setup(r => r.ObtenerEntidadAsync(7)).ReturnsAsync(new RutaVendedor
        {
            Id = 7,
            TenantId = Tenant,
            UsuarioId = AdminUserId,
            Estado = EstadoRuta.EnProgreso,
            Nombre = "Ruta",
        });
        var service = BuildService();

        // Act
        var act = async () => await service.ActualizarAsync(7, new RutaVendedorUpdateDto { Nombre = "Nuevo" });

        // Assert
        (await act.Should().ThrowAsync<InvalidOperationException>())
            .Which.Message.Should().Contain("planificadas");
        _repo.Verify(r => r.ActualizarAsync(It.IsAny<RutaVendedor>()), Times.Never);
    }

    // ===== 5. EliminarAsync — EnProgreso bloquea borrado =====

    [Fact]
    public async Task EliminarAsync_DeberiaLanzarInvalidOperation_CuandoRutaEnProgreso()
    {
        // Arrange: ruta EnProgreso no puede eliminarse (admin tampoco).
        _repo.Setup(r => r.ObtenerEntidadAsync(11)).ReturnsAsync(new RutaVendedor
        {
            Id = 11,
            TenantId = Tenant,
            UsuarioId = VendedorUserId,
            Estado = EstadoRuta.EnProgreso,
        });
        var service = BuildService();

        // Act
        var act = async () => await service.EliminarAsync(11);

        // Assert
        (await act.Should().ThrowAsync<InvalidOperationException>())
            .Which.Message.Should().Contain("progreso");
        _repo.Verify(r => r.EliminarAsync(It.IsAny<int>()), Times.Never);
    }

    // ===== 6. IniciarRutaAsync — Bloqueo cuando faltan paradas y pedidos =====

    [Fact]
    public async Task IniciarRutaAsync_DeberiaLanzarInvalidOperation_CuandoFaltanParadasYPedidos()
    {
        // Arrange: admin intenta iniciar ruta sin paradas activas y sin pedidos.
        _repo.Setup(r => r.ObtenerEntidadAsync(22)).ReturnsAsync(new RutaVendedor
        {
            Id = 22,
            TenantId = Tenant,
            UsuarioId = AdminUserId,
            Estado = EstadoRuta.CargaAceptada,
            Detalles = new List<RutaDetalle>(),
        });
        _repo.Setup(r => r.ObtenerPedidosAsignadosAsync(22, Tenant))
            .ReturnsAsync(new List<RutaPedidoAsignadoDto>());
        var service = BuildService();

        // Act
        var act = async () => await service.IniciarRutaAsync(22);

        // Assert
        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.Which.Message.Should().Contain("paradas");
        ex.Which.Message.Should().Contain("pedidos asignados");
        _repo.Verify(r => r.IniciarRutaAsync(It.IsAny<int>(), It.IsAny<DateTime>()), Times.Never);
    }

    // ===== 7. CompletarRutaAsync — RBAC vendedor no asignado =====

    [Fact]
    public async Task CompletarRutaAsync_DeberiaLanzarUnauthorized_CuandoVendedorNoAsignado()
    {
        // Arrange: vendedor 42 intenta completar la ruta del vendedor 99.
        ConfigureVendedor(VendedorUserId);
        _repo.Setup(r => r.ObtenerEntidadAsync(33)).ReturnsAsync(new RutaVendedor
        {
            Id = 33,
            TenantId = Tenant,
            UsuarioId = 99, // ruta de otro vendedor
            Estado = EstadoRuta.EnProgreso,
        });
        var service = BuildService();

        // Act
        var act = async () => await service.CompletarRutaAsync(33);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repo.Verify(r => r.CompletarRutaAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<double?>()), Times.Never);
    }

    // ===== 8. CancelarRutaDetalladoAsync — Admin cancela y obtiene estado previo =====

    [Fact]
    public async Task CancelarRutaDetalladoAsync_DeberiaRetornarEstadoPrevioYVendedor_CuandoAdminCancela()
    {
        // Arrange: admin cancela ruta EnProgreso del vendedor 42.
        _repo.Setup(r => r.ObtenerEntidadAsync(44)).ReturnsAsync(new RutaVendedor
        {
            Id = 44,
            TenantId = Tenant,
            UsuarioId = VendedorUserId,
            Estado = EstadoRuta.EnProgreso,
        });
        _repo.Setup(r => r.CancelarRutaAsync(44, "motivo")).ReturnsAsync(true);
        var service = BuildService();

        // Act
        var (ok, estadoPrevio, vendedorId) = await service.CancelarRutaDetalladoAsync(44, "motivo");

        // Assert
        ok.Should().BeTrue();
        estadoPrevio.Should().Be(EstadoRuta.EnProgreso);
        vendedorId.Should().Be(VendedorUserId);
        _repo.Verify(r => r.CancelarRutaAsync(44, "motivo"), Times.Once);
    }

    // ===== 9. EnviarACargaAsync — Sin carga bloquea envio =====

    [Fact]
    public async Task EnviarACargaAsync_DeberiaLanzarInvalidOperation_CuandoNoHayCarga()
    {
        // Arrange: ruta planificada sin productos cargados.
        _repo.Setup(r => r.ObtenerEntidadAsync(55)).ReturnsAsync(new RutaVendedor
        {
            Id = 55,
            TenantId = Tenant,
            UsuarioId = AdminUserId,
            Estado = EstadoRuta.Planificada,
            Nombre = "Ruta sin carga",
        });
        _repo.Setup(r => r.ObtenerCargaAsync(55, Tenant)).ReturnsAsync(new List<RutaCargaDto>());
        var service = BuildService();

        // Act
        var act = async () => await service.EnviarACargaAsync(55);

        // Assert
        (await act.Should().ThrowAsync<InvalidOperationException>())
            .Which.Message.Should().Contain("carga");
        _repo.Verify(r => r.EnviarACargaAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<List<int>?>()), Times.Never);
    }

    // ===== 10. InstanciarTemplateAsync — Template no existe =====

    [Fact]
    public async Task InstanciarTemplateAsync_DeberiaLanzarInvalidOperation_CuandoTemplateNoExiste()
    {
        // Arrange: template id 77 no existe en el tenant 1.
        _repo.Setup(r => r.ObtenerTemplateConDetallesAsync(77, Tenant)).ReturnsAsync((RutaVendedor?)null);
        var dto = new InstanciarTemplateDto
        {
            UsuarioId = VendedorUserId,
            Fecha = new DateTime(2026, 6, 8),
        };
        var service = BuildService();

        // Act
        var act = async () => await service.InstanciarTemplateAsync(77, dto);

        // Assert
        (await act.Should().ThrowAsync<InvalidOperationException>())
            .Which.Message.Should().Contain("Template no encontrado");
        _repo.Verify(r => r.CrearAsync(It.IsAny<RutaVendedor>()), Times.Never);
    }
}
