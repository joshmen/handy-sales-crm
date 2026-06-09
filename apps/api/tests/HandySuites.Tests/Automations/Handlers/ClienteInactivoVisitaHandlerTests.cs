using FluentAssertions;
using HandySuites.Api.Automations;
using HandySuites.Api.Automations.Handlers;
using HandySuites.Application.Notifications.DTOs;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Tests.Automations.Handlers;

/// <summary>
/// Tests para ClienteInactivoVisitaHandler — automation que detecta clientes sin visitar
/// en N días, auto-agenda visita al siguiente día hábil 9am en TZ tenant, y notifica
/// al vendedor asignado + admin.
/// </summary>
public class ClienteInactivoVisitaHandlerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;
    private readonly Mock<INotificationService> _notifications = new();
    private readonly ClienteInactivoVisitaHandler _sut = new();

    private const int TenantId = 1;
    private const int AdminId = 10;
    private const int VendedorId = 20;

    public ClienteInactivoVisitaHandlerTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        // Disable FK enforcement — testeamos lógica del handler, no integridad referencial.
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

        SeedFixtures();

        _notifications
            .Setup(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()))
            .ReturnsAsync(new NotificationSendResultDto());
    }

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test SA" });
        _db.CompanySettings.Add(new CompanySetting
        {
            Id = 1,
            TenantId = TenantId,
            CompanyName = "Test SA",
            Timezone = "America/Mexico_City",
            Language = "es",
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = AdminId,
            TenantId = TenantId,
            Email = "admin@test.com",
            Nombre = "Admin",
            PasswordHash = "x",
            RolExplicito = RoleNames.Admin,
            Activo = true,
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = VendedorId,
            TenantId = TenantId,
            Email = "vendedor@test.com",
            Nombre = "Vendedor Uno",
            PasswordHash = "x",
            RolExplicito = RoleNames.Vendedor,
            Activo = true,
        });
        _db.SaveChanges();
    }

    private TenantAutomation CreateAutomation(string? paramsJson = null) => new TenantAutomation
    {
        Id = 1,
        TenantId = TenantId,
        TemplateId = 1,
        ParamsJson = paramsJson,
        Activo = true,
    };

    private AutomationContext CreateContext(string? paramsJson = null)
        => new AutomationContext(CreateAutomation(paramsJson), _db, _notifications.Object, EmailService: null);

    private Cliente AddCliente(int id, string nombre, int? vendedorId, bool esProspecto = false, bool activo = true)
    {
        var c = new Cliente
        {
            Id = id,
            TenantId = TenantId,
            Nombre = nombre,
            RFC = "",
            Correo = "",
            Telefono = "",
            Direccion = "",
            Activo = activo,
            EsProspecto = esProspecto,
            VendedorId = vendedorId,
        };
        _db.Clientes.Add(c);
        return c;
    }

    private ClienteVisita AddVisita(int id, int clienteId, int usuarioId,
        DateTime? fechaInicio = null, DateTime? fechaProgramada = null,
        ResultadoVisita resultado = ResultadoVisita.Venta)
    {
        var v = new ClienteVisita
        {
            Id = id,
            TenantId = TenantId,
            ClienteId = clienteId,
            UsuarioId = usuarioId,
            FechaHoraInicio = fechaInicio,
            FechaProgramada = fechaProgramada,
            Resultado = resultado,
            Activo = true,
        };
        _db.ClienteVisitas.Add(v);
        return v;
    }

    [Fact]
    public async Task ExecuteAsync_ConTodosLosClientesVisitadosRecientemente_DeberiaRetornarSuccessSinAccion()
    {
        AddCliente(1, "Cliente Activo", VendedorId);
        AddVisita(100, 1, VendedorId, fechaInicio: DateTime.UtcNow.AddDays(-5));
        _db.SaveChanges();

        var ctx = CreateContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();
        result.ActionTaken.Should().NotBeNullOrEmpty();
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_ConClienteInactivoYVendedor_DeberiaAgendarVisitaYNotificar()
    {
        AddCliente(1, "Cliente Inactivo", VendedorId);
        // Última visita > 30 días atrás → inactivo bajo default
        AddVisita(100, 1, VendedorId, fechaInicio: DateTime.UtcNow.AddDays(-60));
        _db.SaveChanges();

        var ctx = CreateContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();

        // Debe haber creado una visita programada en el futuro (siguiente día hábil)
        var visitasPendientes = await _db.ClienteVisitas
            .Where(v => v.ClienteId == 1 && v.Resultado == ResultadoVisita.Pendiente)
            .ToListAsync();
        visitasPendientes.Should().HaveCount(1);
        visitasPendientes[0].UsuarioId.Should().Be(VendedorId);
        visitasPendientes[0].TipoVisita.Should().Be(TipoVisita.Seguimiento);
        visitasPendientes[0].FechaProgramada.Should().NotBeNull();

        // Debe haber notificado al menos una vez (push al vendedor o admin)
        _notifications.Verify(n => n.EnviarNotificacionAsync(It.IsAny<SendNotificationDto>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExecuteAsync_ConClienteInactivoSinVendedor_NoDeberiaAgendarVisita()
    {
        AddCliente(1, "Cliente Sin Vendedor", vendedorId: null);
        _db.SaveChanges();

        var ctx = CreateContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();

        var visitasCreadas = await _db.ClienteVisitas
            .Where(v => v.ClienteId == 1 && v.Resultado == ResultadoVisita.Pendiente)
            .CountAsync();
        visitasCreadas.Should().Be(0);
    }

    [Fact]
    public async Task ExecuteAsync_ConVisitaPendienteYaAgendadaEnElFuturo_DeberiaSkipearAgendarOtra()
    {
        AddCliente(1, "Cliente Con Visita Programada", VendedorId);
        // Visita en el pasado para marcarlo inactivo
        AddVisita(100, 1, VendedorId, fechaInicio: DateTime.UtcNow.AddDays(-90));
        // Visita ya agendada en el futuro
        AddVisita(101, 1, VendedorId,
            fechaProgramada: DateTime.UtcNow.AddDays(2),
            resultado: ResultadoVisita.Pendiente);
        _db.SaveChanges();

        var ctx = CreateContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();

        // Solo debe existir la visita pendiente original — el handler no debe duplicar
        var visitasPendientes = await _db.ClienteVisitas
            .Where(v => v.ClienteId == 1 && v.Resultado == ResultadoVisita.Pendiente)
            .CountAsync();
        visitasPendientes.Should().Be(1);
    }

    [Fact]
    public async Task ExecuteAsync_ConClienteProspecto_DeberiaIgnorarlo()
    {
        AddCliente(1, "Prospecto", VendedorId, esProspecto: true);
        _db.SaveChanges();

        var ctx = CreateContext();

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();

        var visitas = await _db.ClienteVisitas
            .Where(v => v.ClienteId == 1)
            .CountAsync();
        visitas.Should().Be(0);
        // No notification for a prospect-only set (sin inactivos reales)
    }

    [Fact]
    public async Task ExecuteAsync_ConDestinatarioAdmin_DeberiaNotificarAlAdmin()
    {
        AddCliente(1, "Cliente Inactivo", VendedorId);
        AddVisita(100, 1, VendedorId, fechaInicio: DateTime.UtcNow.AddDays(-90));
        _db.SaveChanges();

        var ctx = CreateContext(paramsJson: "{\"destinatario\":\"admin\"}");

        var result = await _sut.ExecuteAsync(ctx, CancellationToken.None);

        result.Success.Should().BeTrue();

        // Al menos una notificación enviada al admin (UsuarioId == AdminId)
        _notifications.Verify(
            n => n.EnviarNotificacionAsync(It.Is<SendNotificationDto>(d => d.UsuarioId == AdminId)),
            Times.AtLeastOnce);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
