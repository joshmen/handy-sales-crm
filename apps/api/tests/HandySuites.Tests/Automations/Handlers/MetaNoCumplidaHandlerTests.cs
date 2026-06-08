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
/// Tests para MetaNoCumplidaHandler — recorre las metas activas del periodo
/// actual, calcula el porcentaje alcanzado por vendedor y envía alertas push
/// a vendedores y admin cuando el % está bajo el umbral configurado.
/// </summary>
public class MetaNoCumplidaHandlerTests : IDisposable
{
    private readonly HandySuitesDbContext _db;
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IEmailService> _email = new();
    private readonly MetaNoCumplidaHandler _sut = new();

    private const int TenantId = 1;
    private const int VendedorId = 10;
    private const int AdminId = 11;
    private const int ClienteId = 20;

    public MetaNoCumplidaHandlerTests()
    {
        // InMemory provider — SQLite can't translate Sum/Average on decimal columns
        // and the handler queries Pedidos.SumAsync(p => p.Total). Each test gets an
        // isolated database via a unique Guid name.
        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseInMemoryDatabase($"MetaNoCumplida-{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _db = new HandySuitesDbContext(options);
        _db.Database.EnsureCreated();

        SeedBaseFixtures();

        _notifications.Setup(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()))
            .ReturnsAsync(new NotificationSendResultDto { Success = true });
    }

    private void SeedBaseFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test Tenant" });
        _db.Usuarios.Add(new Usuario
        {
            Id = VendedorId, TenantId = TenantId, Email = "v@test.com",
            Nombre = "Vendedor Uno", PasswordHash = "x",
            RolExplicito = RoleNames.Vendedor, Activo = true,
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = AdminId, TenantId = TenantId, Email = "a@test.com",
            Nombre = "Admin", PasswordHash = "x",
            RolExplicito = RoleNames.Admin, Activo = true,
        });
        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId, TenantId = TenantId, Nombre = "Cliente X",
            RFC = "", Correo = "", Telefono = "", Direccion = "", Activo = true,
        });
        _db.CompanySettings.Add(new CompanySetting
        {
            Id = 1, TenantId = TenantId, CompanyName = "Test",
            Timezone = "America/Mexico_City", Language = "es", Currency = "MXN",
        });
        _db.SaveChanges();
    }

    private AutomationContext BuildContext(string? paramsJson = null)
    {
        var automation = new TenantAutomation
        {
            Id = 1, TenantId = TenantId, TemplateId = 1,
            ParamsJson = paramsJson, Activo = true,
        };
        return new AutomationContext(automation, _db, _notifications.Object, _email.Object);
    }

    private void AddMeta(string tipo, decimal monto, int diasInicio = -7, int diasFin = 7)
    {
        var now = DateTime.UtcNow;
        _db.Set<MetaVendedor>().Add(new MetaVendedor
        {
            Id = (int)(DateTime.UtcNow.Ticks % 100000),
            TenantId = TenantId, UsuarioId = VendedorId,
            Tipo = tipo, Periodo = "mensual", Monto = monto,
            FechaInicio = now.AddDays(diasInicio),
            FechaFin = now.AddDays(diasFin),
            Activo = true,
        });
        _db.SaveChanges();
    }

    private void AddPedido(decimal total, DateTime fecha, EstadoPedido estado = EstadoPedido.Entregado)
    {
        var id = (int)(DateTime.UtcNow.Ticks % 1000000) + Random.Shared.Next(1, 9999);
        _db.Pedidos.Add(new Pedido
        {
            Id = id, TenantId = TenantId, ClienteId = ClienteId, UsuarioId = VendedorId,
            NumeroPedido = $"PED-{id}", Estado = estado,
            TipoVenta = TipoVenta.Preventa, Subtotal = total, Total = total,
            Activo = true, FechaPedido = fecha,
        });
        _db.SaveChanges();
    }

    [Fact]
    public async Task ExecuteAsync_SinMetasConfiguradas_RetornaResultadoExitosoSinAlertas()
    {
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        result.ActionTaken.Should().NotBeNullOrEmpty();
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_TodosLosVendedoresPorEncimaDelUmbral_NoEnviaAlertas()
    {
        // Meta de 1000 con 1000 vendidos => 100% => por encima del umbral default (80)
        AddMeta("ventas", monto: 1000m);
        AddPedido(total: 1000m, fecha: DateTime.UtcNow.AddDays(-1));
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_VendedorBajoUmbralEnVentas_EnviaAlertaPushAlVendedorYAlAdmin()
    {
        // Meta 1000, real 100 => 10% < 80%
        AddMeta("ventas", monto: 1000m);
        AddPedido(total: 100m, fecha: DateTime.UtcNow.AddDays(-1));
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        result.ActionTaken.Should().NotBeNullOrEmpty();
        // Una al vendedor + una al admin
        _notifications.Verify(n => n.EnviarNotificacionAsync(
            It.Is<SendNotificationDto>(d => d.UsuarioId == VendedorId)), Times.AtLeastOnce);
        _notifications.Verify(n => n.EnviarNotificacionAsync(
            It.Is<SendNotificationDto>(d => d.UsuarioId == AdminId)), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExecuteAsync_PedidosCancelados_NoCuentanParaElTotalRealizado()
    {
        // Meta 1000. Hay un pedido cancelado de 1000 (no debe contar) y nada más => 0% => alerta
        AddMeta("ventas", monto: 1000m);
        AddPedido(total: 1000m, fecha: DateTime.UtcNow.AddDays(-1), estado: EstadoPedido.Cancelado);
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        _notifications.Verify(n => n.EnviarNotificacionAsync(
            It.Is<SendNotificationDto>(d => d.UsuarioId == VendedorId)), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExecuteAsync_UmbralCustomViaParams_RespetaConfiguracion()
    {
        // Meta 1000 con 900 realizado => 90%. Con umbral default (80) no alerta; con 95 sí.
        AddMeta("ventas", monto: 1000m);
        AddPedido(total: 900m, fecha: DateTime.UtcNow.AddDays(-1));
        var ctx = BuildContext(paramsJson: "{\"porcentaje_alerta\": 95}");

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        _notifications.Verify(n => n.EnviarNotificacionAsync(
            It.Is<SendNotificationDto>(d => d.UsuarioId == VendedorId)), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExecuteAsync_MetaPorConteoDePedidos_CalculaUsandoCount()
    {
        // Meta "pedidos" = 10. Solo hay 1 pedido vigente => 10% < 80% => alerta.
        AddMeta("pedidos", monto: 10m);
        AddPedido(total: 50m, fecha: DateTime.UtcNow.AddDays(-1));
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        _notifications.Verify(n => n.EnviarNotificacionAsync(
            It.Is<SendNotificationDto>(d => d.UsuarioId == VendedorId)), Times.AtLeastOnce);
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
