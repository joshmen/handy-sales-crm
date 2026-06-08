using FluentAssertions;
using HandySuites.Api.Automations;
using HandySuites.Api.Automations.Handlers;
using HandySuites.Application.Notifications.DTOs;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Email;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Tests.Automations.Handlers;

/// <summary>
/// Tests para PedidoRecurrenteHandler — automation que detecta clientes con
/// ciclo de reorden superado y notifica al vendedor/admin via push + email.
///
/// Setup: SQLite in-memory para Pedidos/Clientes/Usuarios + Mocks para
/// INotificationService e IEmailService. La logica del handler depende de
/// historial de pedidos (count, fecha primer/ultimo, monto promedio) y
/// calcula la urgencia de cada cliente.
/// </summary>
public class PedidoRecurrenteHandlerTests : IDisposable
{
    private readonly HandySuitesDbContext _db;
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IEmailService> _emailService = new();
    private readonly PedidoRecurrenteHandler _sut = new();

    private const int TenantId = 1;
    private const int AdminUserId = 10;
    private const int VendedorUserId = 11;
    private const int ClienteId = 100;
    private const int ClienteSinHistorialId = 101;

    public PedidoRecurrenteHandlerTests()
    {
        // InMemory provider — SQLite can't translate Sum/Average on decimal columns
        // and the handler queries Pedidos.Average(p => p.Total). Each test gets an
        // isolated database via a unique Guid name.
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase($"PedidoRecurrente-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new HandySuitesDbContext(options);
        _db.Database.EnsureCreated();
    }

    private void SeedTenantAndUsers()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test SA" });
        _db.Usuarios.Add(new Usuario
        {
            Id = AdminUserId, TenantId = TenantId, Email = "admin@test.com",
            Nombre = "Admin", PasswordHash = "x",
            RolExplicito = RoleNames.Admin, Activo = true,
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = VendedorUserId, TenantId = TenantId, Email = "vend@test.com",
            Nombre = "Vendedor", PasswordHash = "x",
            RolExplicito = RoleNames.Vendedor, Activo = true,
        });
        _db.SaveChanges();
    }

    private void SeedClienteConHistorial(int clienteId, int? vendedorId, int totalPedidos,
        DateTime primerPedido, DateTime ultimoPedido, decimal montoPromedio)
    {
        _db.Clientes.Add(new Cliente
        {
            Id = clienteId, TenantId = TenantId, Nombre = $"Cliente {clienteId}",
            RFC = "", Correo = "", Telefono = "", Direccion = "",
            VendedorId = vendedorId, Activo = true,
        });

        for (int i = 0; i < totalPedidos; i++)
        {
            var fecha = totalPedidos == 1
                ? primerPedido
                : primerPedido.AddDays(((ultimoPedido - primerPedido).TotalDays / (totalPedidos - 1)) * i);
            _db.Pedidos.Add(new Pedido
            {
                Id = clienteId * 100 + i,
                TenantId = TenantId,
                ClienteId = clienteId,
                UsuarioId = vendedorId ?? AdminUserId,
                NumeroPedido = $"PED-{clienteId}-{i}",
                Estado = EstadoPedido.Entregado,
                TipoVenta = TipoVenta.Preventa,
                Subtotal = montoPromedio,
                Total = montoPromedio,
                FechaPedido = fecha,
                Activo = true,
            });
        }
        _db.SaveChanges();
    }

    private TenantAutomation CreateAutomation(string? paramsJson = null)
    {
        return new TenantAutomation
        {
            Id = 1,
            TenantId = TenantId,
            TemplateId = 1,
            ParamsJson = paramsJson,
            Activo = true,
        };
    }

    private AutomationContext CreateContext(TenantAutomation automation)
        => new(automation, _db, _notifications.Object, _emailService.Object);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Slug — sanity check basico
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public void Slug_DeberiaSerPedidoRecurrente()
    {
        _sut.Slug.Should().Be("pedido-recurrente");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Sin clientes con suficiente historial → sale temprano sin notificar
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ExecuteAsync_SinClientesConSuficienteHistorial_DeberiaRetornarSinClientesRecurrentes()
    {
        // Arrange — solo 1 pedido por cliente (default min = 3)
        SeedTenantAndUsers();
        SeedClienteConHistorial(ClienteSinHistorialId, VendedorUserId,
            totalPedidos: 1,
            primerPedido: DateTime.UtcNow.AddDays(-100),
            ultimoPedido: DateTime.UtcNow.AddDays(-100),
            montoPromedio: 500m);

        var ctx = CreateContext(CreateAutomation());

        // Act
        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.ActionTaken.Should().NotBeNullOrEmpty();
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.Never);
        _emailService.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Clientes con suficiente historial pero ciclo normal → no notificar
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ExecuteAsync_CicloNormal_DeberiaRetornarTodosClientesCicloNormal()
    {
        // Arrange — 4 pedidos cada 30 dias, ultimo hace solo 10 dias → urgencia ~0.33 (< 1.2)
        SeedTenantAndUsers();
        var ultimoPedido = DateTime.UtcNow.AddDays(-10);
        var primerPedido = ultimoPedido.AddDays(-90);
        SeedClienteConHistorial(ClienteId, VendedorUserId,
            totalPedidos: 4,
            primerPedido: primerPedido,
            ultimoPedido: ultimoPedido,
            montoPromedio: 1000m);

        var ctx = CreateContext(CreateAutomation());

        // Act
        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.ActionTaken.Should().NotBeNullOrEmpty();
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.Never);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Cliente con ciclo superado → push al vendedor + admin + email
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ExecuteAsync_ClienteConCicloSuperado_DeberiaNotificarYRetornarSuccess()
    {
        // Arrange — 3 pedidos cada 30 dias, ultimo hace 100 dias → urgencia ~3.3 (>= 1.2)
        SeedTenantAndUsers();
        var ultimoPedido = DateTime.UtcNow.AddDays(-100);
        var primerPedido = ultimoPedido.AddDays(-60);
        SeedClienteConHistorial(ClienteId, VendedorUserId,
            totalPedidos: 3,
            primerPedido: primerPedido,
            ultimoPedido: ultimoPedido,
            montoPromedio: 1500m);

        var ctx = CreateContext(CreateAutomation("{\"destinatario\":\"ambos\"}"));

        // Act
        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.ActionTaken.Should().NotBeNullOrEmpty();
        // Vendedor + admin (al menos 2 pushes)
        _notifications.Verify(
            n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()),
            Times.AtLeast(2));
        // Email rich al admin
        _emailService.Verify(
            e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.AtLeastOnce);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Destinatario admin only → push al admin pero no al vendedor del cliente
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ExecuteAsync_DestinatarioAdmin_DeberiaNotificarSoloAdmin()
    {
        // Arrange — ciclo claramente superado
        SeedTenantAndUsers();
        var ultimoPedido = DateTime.UtcNow.AddDays(-150);
        var primerPedido = ultimoPedido.AddDays(-60);
        SeedClienteConHistorial(ClienteId, VendedorUserId,
            totalPedidos: 3,
            primerPedido: primerPedido,
            ultimoPedido: ultimoPedido,
            montoPromedio: 1000m);

        var ctx = CreateContext(CreateAutomation("{\"destinatario\":\"admin\"}"));

        // Act
        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        // El vendedor del cliente NO debe ser notificado en modo admin-only
        _notifications.Verify(
            n => n.EnviarNotificacionAsync(It.Is<SendNotificationDto>(d => d.UsuarioId == VendedorUserId)),
            Times.Never);
        // El admin sí
        _notifications.Verify(
            n => n.EnviarNotificacionAsync(It.Is<SendNotificationDto>(d => d.UsuarioId == AdminUserId)),
            Times.AtLeastOnce);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Pedidos cancelados NO cuentan para el historial
    // ─────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ExecuteAsync_PedidosCancelados_NoCuentanParaElHistorial()
    {
        // Arrange — todos los pedidos del cliente son cancelados → no llega al min
        SeedTenantAndUsers();
        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId, TenantId = TenantId, Nombre = "Cliente cancelado",
            RFC = "", Correo = "", Telefono = "", Direccion = "",
            VendedorId = VendedorUserId, Activo = true,
        });
        for (int i = 0; i < 5; i++)
        {
            _db.Pedidos.Add(new Pedido
            {
                Id = ClienteId * 100 + i,
                TenantId = TenantId,
                ClienteId = ClienteId,
                UsuarioId = VendedorUserId,
                NumeroPedido = $"PED-CANC-{i}",
                Estado = EstadoPedido.Cancelado,
                TipoVenta = TipoVenta.Preventa,
                Subtotal = 1000m,
                Total = 1000m,
                FechaPedido = DateTime.UtcNow.AddDays(-100 + i * 10),
                Activo = true,
            });
        }
        _db.SaveChanges();

        var ctx = CreateContext(CreateAutomation());

        // Act
        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        // Sin pedidos validos: no debe llegar a notificar
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.Never);
        _emailService.Verify(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
