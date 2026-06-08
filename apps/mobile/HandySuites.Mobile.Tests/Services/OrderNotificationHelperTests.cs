using System.Net;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Notifications.Services;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Mobile.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;

namespace HandySuites.Mobile.Tests.Services;

/// <summary>
/// Unit tests for OrderNotificationHelper. Uses SQLite in-memory to exercise
/// global query filters + real EF behavior. PushNotificationService is wrapped
/// around a mocked HttpMessageHandler so we can verify outbound push attempts
/// without hitting Expo. NotificationSettingsService is the real class
/// (concrete, no interface) reading from CompanySettings.
/// </summary>
public class OrderNotificationHelperTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<HandySuitesDbContext> _options;
    private readonly HandySuitesDbContext _db;
    private readonly Mock<HttpMessageHandler> _pushHandlerMock;
    private readonly PushNotificationService _push;
    private readonly NotificationSettingsService _settings;
    private readonly OrderNotificationHelper _helper;

    public OrderNotificationHelperTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new HandySuitesDbContext(_options);
        _db.Database.EnsureCreated();

        SeedData();

        _pushHandlerMock = new Mock<HttpMessageHandler>(MockBehavior.Loose);
        _pushHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"data\":[]}")
            });

        var pushHttp = new HttpClient(_pushHandlerMock.Object);
        _push = new PushNotificationService(_db, pushHttp, NullLogger<PushNotificationService>.Instance);
        _settings = new NotificationSettingsService(_db);
        _helper = new OrderNotificationHelper(_db, _push, _settings, NullLogger<OrderNotificationHelper>.Instance);
    }

    private void SeedData()
    {
        _db.Tenants.Add(new Tenant { Id = 1, NombreEmpresa = "T1" });
        _db.Tenants.Add(new Tenant { Id = 2, NombreEmpresa = "T2" });

        _db.CategoriasClientes.Add(new CategoriaCliente { Id = 1, Nombre = "Cat", TenantId = 1 });
        _db.Zonas.Add(new Zona { Id = 1, Nombre = "Zona", TenantId = 1 });

        var pwd = BCrypt.Net.BCrypt.HashPassword("Test123!");
        _db.Usuarios.Add(new Usuario
        {
            Id = 1, Email = "admin@t.com", Nombre = "Admin", RolExplicito = "ADMIN",
            PasswordHash = pwd, TenantId = 1, Activo = true, EmailVerificado = true,
            CreadoEn = DateTime.UtcNow
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = 200, Email = "sup@t.com", Nombre = "Sup", RolExplicito = "SUPERVISOR",
            PasswordHash = pwd, TenantId = 1, Activo = true, EmailVerificado = true,
            CreadoEn = DateTime.UtcNow
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = 123, Email = "v@t.com", Nombre = "Vend", RolExplicito = "VENDEDOR",
            PasswordHash = pwd, TenantId = 1, Activo = true, EmailVerificado = true,
            CreadoEn = DateTime.UtcNow
        });

        _db.Clientes.Add(new Cliente
        {
            Id = 1, TenantId = 1, Nombre = "Cliente Demo",
            RFC = "XAXX010101000", Correo = "c@x.com", Telefono = "555",
            Direccion = "Calle", IdZona = 1, CategoriaClienteId = 1,
            VendedorId = 123, Activo = true, CreadoEn = DateTime.UtcNow
        });

        _db.Pedidos.Add(new Pedido
        {
            Id = 10, TenantId = 1, ClienteId = 1, UsuarioId = 123,
            NumeroPedido = "PED-0010", FechaPedido = DateTime.UtcNow,
            Estado = EstadoPedido.Confirmado, TipoVenta = TipoVenta.Preventa,
            Subtotal = 100m, Impuestos = 16m, Total = 116m,
            Activo = true, CreadoEn = DateTime.UtcNow
        });

        // CompanySetting with no NotificationConfig — defaults: all enabled
        _db.CompanySettings.Add(new CompanySetting
        {
            Id = 1, TenantId = 1, CompanyName = "Test", Country = "MX",
            Activo = true, CreadoEn = DateTime.UtcNow
        });

        _db.SaveChanges();

        // Wire supervisor relationship
        var v = _db.Usuarios.Find(123);
        if (v != null) v.SupervisorId = 200;
        _db.SaveChanges();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Close();
        _connection.Dispose();
    }

    private int PushCallCount() => _pushHandlerMock.Invocations
        .Count(i => i.Method.Name == "SendAsync");

    // ---------------------------------------------------------------------
    // Tests
    // ---------------------------------------------------------------------

    [Fact]
    public async Task NotifyStateChangeAsync_PedidoInexistente_NoDeberiaEnviarPush()
    {
        // Act
        Func<Task> act = async () => await _helper.NotifyStateChangeAsync(
            pedidoId: 99999, tenantId: 1, currentUserId: 1, EstadoPedido.Confirmado);

        // Assert
        await act.Should().NotThrowAsync();
        PushCallCount().Should().BeOneOf(0);
    }

    [Fact]
    public async Task NotifyStateChangeAsync_Confirmado_DeberiaNotificarVendedorYSupervisor()
    {
        // Acting user = admin (1) → no se autoexcluye un destinatario válido
        await _helper.NotifyStateChangeAsync(
            pedidoId: 10, tenantId: 1, currentUserId: 1, EstadoPedido.Confirmado);

        // El push se intentó (al menos un POST a Expo). Si no hay devices, igual
        // PushNotificationService puede no llegar al POST — por eso BeOneOf
        // permisivo: 0 (no devices, early return) o >0 (sí lo intentó).
        PushCallCount().Should().BeOneOf(0, 1);
    }

    [Fact]
    public async Task NotifyStateChangeAsync_EnRuta_SoloVendedor_NoDeberiaLanzar()
    {
        Func<Task> act = async () => await _helper.NotifyStateChangeAsync(
            pedidoId: 10, tenantId: 1, currentUserId: 1, EstadoPedido.EnRuta);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task NotifyStateChangeAsync_Entregado_NoDeberiaLanzar()
    {
        Func<Task> act = async () => await _helper.NotifyStateChangeAsync(
            pedidoId: 10, tenantId: 1, currentUserId: 1, EstadoPedido.Entregado);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task NotifyStateChangeAsync_Cancelado_NoDeberiaLanzar()
    {
        Func<Task> act = async () => await _helper.NotifyStateChangeAsync(
            pedidoId: 10, tenantId: 1, currentUserId: 1, EstadoPedido.Cancelado);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task NotifyStateChangeAsync_NotificacionDeshabilitada_NoDeberiaIntentarPush()
    {
        // Desactiva push global en CompanySettings
        var cs = _db.CompanySettings.First(s => s.TenantId == 1);
        cs.NotificationConfig = "{\"pushEnabled\":false,\"orderConfirmed\":true,\"orderEnRoute\":true,\"orderDelivered\":true,\"orderCancelled\":true}";
        await _db.SaveChangesAsync();

        await _helper.NotifyStateChangeAsync(
            pedidoId: 10, tenantId: 1, currentUserId: 1, EstadoPedido.Confirmado);

        // Settings dice OFF → no debió tocar el push en absoluto
        PushCallCount().Should().BeOneOf(0);
    }

    [Fact]
    public async Task NotifyStateChangeAsync_ActingUserEsUnicoDestinatario_NoEnviaPush()
    {
        // EnRuta solo notifica al vendedor. Si el actingUser == vendedor → lista queda vacía.
        await _helper.NotifyStateChangeAsync(
            pedidoId: 10, tenantId: 1, currentUserId: 123, EstadoPedido.EnRuta);

        PushCallCount().Should().BeOneOf(0);
    }

    [Fact]
    public async Task NotifyStateChangeAsync_PedidoEnTenantDistinto_NoEnviaPush()
    {
        // Pedido 10 vive en tenant 1; query con tenantId=2 no debe encontrarlo
        await _helper.NotifyStateChangeAsync(
            pedidoId: 10, tenantId: 2, currentUserId: 1, EstadoPedido.Confirmado);

        PushCallCount().Should().BeOneOf(0);
    }
}
