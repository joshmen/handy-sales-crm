using FluentAssertions;
using HandySuites.Api.Automations;
using HandySuites.Api.Automations.Handlers;
using HandySuites.Application.Notifications.DTOs;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Email;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Tests.Automations.Handlers;

/// <summary>
/// Tests para RutaSemanalAutoHandler — genera automaticamente una ruta semanal
/// (proximo lunes) por cada vendedor activo, asignando hasta `max_paradas`
/// clientes priorizados por dias desde la ultima visita completada. Cuando los
/// clientes tienen coordenadas, ordena por nearest-neighbor; sino, por urgencia.
/// </summary>
public class RutaSemanalAutoHandlerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IEmailService> _email = new();
    private readonly RutaSemanalAutoHandler _sut = new();

    private const int TenantId = 1;
    private const int VendedorId = 10;
    private const int AdminId = 11;

    public RutaSemanalAutoHandlerTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using (var pragma = _connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA foreign_keys = OFF;";
            pragma.ExecuteNonQuery();
        }

        var options = new DbContextOptionsBuilder<HandySuitesDbContext>()
            .UseSqlite(_connection)
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
        _db.CompanySettings.Add(new CompanySetting
        {
            Id = 1, TenantId = TenantId, CompanyName = "Test",
            Timezone = "America/Mexico_City", Language = "es", Currency = "MXN",
        });
        _db.SaveChanges();
    }

    private void AddVendedor(int id = VendedorId, string nombre = "Vendedor Uno", bool activo = true)
    {
        _db.Usuarios.Add(new Usuario
        {
            Id = id, TenantId = TenantId, Email = $"v{id}@test.com",
            Nombre = nombre, PasswordHash = "x",
            RolExplicito = RoleNames.Vendedor, Activo = activo,
        });
        _db.SaveChanges();
    }

    private void AddAdmin(int id = AdminId)
    {
        _db.Usuarios.Add(new Usuario
        {
            Id = id, TenantId = TenantId, Email = $"a{id}@test.com",
            Nombre = "Admin", PasswordHash = "x",
            RolExplicito = RoleNames.Admin, Activo = true,
        });
        _db.SaveChanges();
    }

    private void AddCliente(int id, int vendedorId, double? lat = null, double? lon = null,
        bool activo = true, bool esProspecto = false)
    {
        _db.Clientes.Add(new Cliente
        {
            Id = id, TenantId = TenantId, Nombre = $"Cliente {id}",
            RFC = "", Correo = "", Telefono = "", Direccion = "",
            VendedorId = vendedorId, Latitud = lat, Longitud = lon,
            Activo = activo, EsProspecto = esProspecto,
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

    [Fact]
    public async Task ExecuteAsync_SinVendedoresActivos_RetornaResultadoSinVendedoresYNoNotifica()
    {
        // No vendedores agregados — solo el tenant base.
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        result.ActionTaken.Should().NotBeNullOrEmpty();
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.Never);
        _db.RutasVendedor.Count().Should().Be(0);
    }

    [Fact]
    public async Task ExecuteAsync_VendedorSinClientesAsignados_NoCreaRutaNiNotifica()
    {
        AddVendedor();
        // Sin clientes asignados a este vendedor
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        _db.RutasVendedor.Count().Should().Be(0);
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_VendedorConClientesAsignados_CreaRutaConDetalles()
    {
        AddVendedor();
        AddAdmin();
        AddCliente(100, VendedorId, lat: 19.43, lon: -99.13);
        AddCliente(101, VendedorId, lat: 19.44, lon: -99.14);
        AddCliente(102, VendedorId); // sin coordenadas
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        result.ActionTaken.Should().NotBeNullOrEmpty();

        var rutas = _db.RutasVendedor.ToList();
        rutas.Should().HaveCount(1);
        var ruta = rutas.Single();
        ruta.UsuarioId.Should().Be(VendedorId);
        ruta.Estado.Should().Be(EstadoRuta.Planificada);
        ruta.TenantId.Should().Be(TenantId);

        var detalles = _db.RutasDetalle.Where(d => d.RutaId == ruta.Id).ToList();
        detalles.Should().HaveCountGreaterThan(0);
        detalles.Should().OnlyContain(d => d.Estado == EstadoParada.Pendiente);
        // Orden 1..N consecutivo
        detalles.Select(d => d.OrdenVisita).Should().BeEquivalentTo(Enumerable.Range(1, detalles.Count));
    }

    [Fact]
    public async Task ExecuteAsync_RespetaParametroMaxParadas()
    {
        AddVendedor();
        AddAdmin();
        // 5 clientes, max_paradas = 2 => solo 2 paradas en la ruta
        for (int i = 0; i < 5; i++)
            AddCliente(200 + i, VendedorId, lat: 19.4 + i * 0.01, lon: -99.1 - i * 0.01);

        var ctx = BuildContext(paramsJson: "{\"max_paradas\": 2}");

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        var ruta = _db.RutasVendedor.Single();
        var detalles = _db.RutasDetalle.Where(d => d.RutaId == ruta.Id).ToList();
        detalles.Should().HaveCount(2);
    }

    [Fact]
    public async Task ExecuteAsync_ClientesInactivosOProspectos_SonExcluidos()
    {
        AddVendedor();
        AddCliente(300, VendedorId, lat: 19.43, lon: -99.13, activo: true, esProspecto: false);
        AddCliente(301, VendedorId, lat: 19.44, lon: -99.14, activo: false); // inactivo => excluido
        AddCliente(302, VendedorId, lat: 19.45, lon: -99.15, esProspecto: true); // prospecto => excluido
        var ctx = BuildContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        var ruta = _db.RutasVendedor.Single();
        var detalles = _db.RutasDetalle.Where(d => d.RutaId == ruta.Id).ToList();
        // Solo el cliente activo y no-prospecto debe estar en la ruta
        detalles.Should().ContainSingle(d => d.ClienteId == 300);
        detalles.Should().NotContain(d => d.ClienteId == 301 || d.ClienteId == 302);
    }

    [Fact]
    public async Task ExecuteAsync_DestinatarioAmbos_NotificaAVendedorYAdmin()
    {
        AddVendedor();
        AddAdmin();
        AddCliente(400, VendedorId, lat: 19.43, lon: -99.13);
        var ctx = BuildContext(paramsJson: "{\"destinatario\": \"ambos\"}");

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        // Una al vendedor por ruta generada
        _notifications.Verify(n => n.EnviarNotificacionAsync(
            It.Is<SendNotificationDto>(d => d.UsuarioId == VendedorId)), Times.AtLeastOnce);
        // Una al admin con el resumen
        _notifications.Verify(n => n.EnviarNotificacionAsync(
            It.Is<SendNotificationDto>(d => d.UsuarioId == AdminId)), Times.AtLeastOnce);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
