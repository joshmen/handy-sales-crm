using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Rutas.DTOs;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories.Rutas;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Tests.Infrastructure.Rutas;

/// <summary>
/// Tests de unidad para RutaVendedorRepository usando SQLite InMemory.
/// FK deshabilitadas — solo se prueba la lógica del repositorio.
/// </summary>
public class RutaVendedorRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;
    private readonly RutaVendedorRepository _sut;
    private readonly Mock<ITenantTimeZoneService> _tzMock;

    private const int TenantId = 1;
    private const int UsuarioId = 10;
    private const int ZonaId = 50;
    private const int ProductoId = 200;
    private const int ClienteId = 300;

    public RutaVendedorRepositoryTests()
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

        _tzMock = new Mock<ITenantTimeZoneService>();
        _tzMock.Setup(t => t.GetTenantTimeZoneAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(TimeZoneInfo.Utc);
        _tzMock.Setup(t => t.GetTenantTodayAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(DateOnly.FromDateTime(DateTime.UtcNow));
        _tzMock.Setup(t => t.GetTenantDayWindowUtcAsync(It.IsAny<DateOnly?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync<DateOnly?, CancellationToken, ITenantTimeZoneService, (DateTime, DateTime)>((d, _) =>
            {
                var dia = d ?? DateOnly.FromDateTime(DateTime.UtcNow);
                var inicio = new DateTime(dia.Year, dia.Month, dia.Day, 0, 0, 0, DateTimeKind.Utc);
                return (inicio, inicio.AddDays(1));
            });
        // Window de día-calendario (medianoche UTC, sin shift) — la usan las queries
        // de rutas para campos date-only. Refleja la impl real.
        _tzMock.Setup(t => t.GetCalendarDayWindowUtc(It.IsAny<DateOnly>()))
            .Returns<DateOnly>(dia =>
            {
                var inicio = new DateTime(dia.Year, dia.Month, dia.Day, 0, 0, 0, DateTimeKind.Utc);
                return (inicio, inicio.AddDays(1));
            });
        _tzMock.Setup(t => t.GetTenantTodayMidnightUtcAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
                return new DateTime(hoy.Year, hoy.Month, hoy.Day, 0, 0, 0, DateTimeKind.Utc);
            });
        _tzMock.Setup(t => t.GetTenantDayFromUtcAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync<DateTime, CancellationToken, ITenantTimeZoneService, DateOnly>((utc, _) => DateOnly.FromDateTime(utc));

        _sut = new RutaVendedorRepository(_db, _tzMock.Object);

        SeedFixtures();
    }

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test SA" });
        _db.Productos.Add(new Producto
        {
            Id = ProductoId, TenantId = TenantId, Nombre = "Producto X",
            CodigoBarra = "X1", Descripcion = "Producto X desc",
            PrecioBase = 10m, Activo = true,
        });
        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId, TenantId = TenantId, Nombre = "Cliente X",
            RFC = "XAXX010101000", Correo = "c@x.com", Telefono = "0", Direccion = "",
            Activo = true,
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = UsuarioId, TenantId = TenantId, Email = "v@test.com",
            Nombre = "Vendedor", PasswordHash = "x", RolExplicito = RoleNames.Vendedor, Activo = true,
        });
        _db.Zonas.Add(new Zona
        {
            Id = ZonaId, TenantId = TenantId, Nombre = "Zona Centro", Activo = true,
        });
        _db.SaveChanges();
    }

    private RutaVendedor AddRuta(int id, DateTime fecha, EstadoRuta estado = EstadoRuta.Planificada, bool activo = true)
    {
        var ruta = new RutaVendedor
        {
            Id = id, TenantId = TenantId, UsuarioId = UsuarioId,
            Codigo = $"RT-{fecha:yyyyMMdd}-{id:D4}",
            Nombre = $"Ruta {id}", Fecha = fecha,
            Estado = estado, Activo = activo,
        };
        _db.RutasVendedor.Add(ruta);
        _db.SaveChanges();
        return ruta;
    }

    [Fact]
    public async Task CrearAsync_DeberiaInsertarYRetornarId()
    {
        // Arrange
        var ruta = new RutaVendedor
        {
            TenantId = TenantId, UsuarioId = UsuarioId,
            Codigo = "RT-20260601-0001", Nombre = "Nueva Ruta",
            Fecha = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            Estado = EstadoRuta.Planificada, Activo = true,
        };

        // Act
        var id = await _sut.CrearAsync(ruta);

        // Assert
        id.Should().BeGreaterThan(0);
        var fromDb = await _db.RutasVendedor.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        fromDb.Should().NotBeNull();
        fromDb!.Nombre.Should().Be("Nueva Ruta");
    }

    [Fact]
    public async Task EliminarAsync_DeberiaMarcarComoInactivoYRetornarTrue()
    {
        // Arrange
        var ruta = AddRuta(601, new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc));

        // Act
        var result = await _sut.EliminarAsync(ruta.Id);

        // Assert
        result.Should().BeTrue();
        var fromDb = await _db.RutasVendedor.IgnoreQueryFilters().AsNoTracking().FirstAsync(r => r.Id == ruta.Id);
        fromDb.Activo.Should().BeFalse();
    }

    [Fact]
    public async Task EliminarAsync_RutaInexistente_DeberiaRetornarFalse()
    {
        // Act
        var result = await _sut.EliminarAsync(id: 999999);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IniciarRutaAsync_DesdePlanificada_DeberiaCambiarAEnProgreso()
    {
        // Arrange
        var ruta = AddRuta(602, new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc), EstadoRuta.Planificada);
        var horaInicio = new DateTime(2026, 6, 1, 8, 0, 0, DateTimeKind.Utc);

        // Act
        var result = await _sut.IniciarRutaAsync(ruta.Id, horaInicio);

        // Assert
        result.Should().BeTrue();
        var fromDb = await _db.RutasVendedor.AsNoTracking().FirstAsync(r => r.Id == ruta.Id);
        fromDb.Estado.Should().Be(EstadoRuta.EnProgreso);
        fromDb.HoraInicioReal.Should().Be(horaInicio);
    }

    [Fact]
    public async Task IniciarRutaAsync_EstadoInvalido_DeberiaRetornarFalse()
    {
        // Arrange — ruta ya completada NO puede iniciarse
        var ruta = AddRuta(603, new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc), EstadoRuta.Completada);

        // Act
        var result = await _sut.IniciarRutaAsync(ruta.Id, DateTime.UtcNow);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task AceptarRutaAsync_DesdePendienteAceptar_DeberiaTransicionarACargaAceptada()
    {
        // Arrange
        var ruta = AddRuta(604, new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc), EstadoRuta.PendienteAceptar);
        var aceptadaEn = new DateTime(2026, 6, 1, 7, 30, 0, DateTimeKind.Utc);

        // Act
        var result = await _sut.AceptarRutaAsync(ruta.Id, aceptadaEn);

        // Assert
        result.Should().BeTrue();
        var fromDb = await _db.RutasVendedor.AsNoTracking().FirstAsync(r => r.Id == ruta.Id);
        fromDb.Estado.Should().Be(EstadoRuta.CargaAceptada);
        fromDb.AceptadaEn.Should().Be(aceptadaEn);
    }

    [Fact]
    public async Task CompletarRutaAsync_DesdeEnProgreso_DeberiaSetearHoraFinYKilometros()
    {
        // Arrange
        var ruta = AddRuta(605, new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc), EstadoRuta.EnProgreso);
        var horaFin = new DateTime(2026, 6, 1, 17, 0, 0, DateTimeKind.Utc);

        // Act
        var result = await _sut.CompletarRutaAsync(ruta.Id, horaFin, kilometrosReales: 45.7);

        // Assert
        result.Should().BeTrue();
        var fromDb = await _db.RutasVendedor.AsNoTracking().FirstAsync(r => r.Id == ruta.Id);
        fromDb.Estado.Should().Be(EstadoRuta.Completada);
        fromDb.HoraFinReal.Should().Be(horaFin);
        fromDb.KilometrosReales.Should().Be(45.7);
    }

    [Fact]
    public async Task GenerarCodigoRutaAsync_SinPrevios_DeberiaRetornarSecuencia0001()
    {
        // Arrange
        var fecha = new DateTime(2026, 7, 15, 0, 0, 0, DateTimeKind.Utc);

        // Act
        var codigo = await _sut.GenerarCodigoRutaAsync(TenantId, fecha, esTemplate: false);

        // Assert
        codigo.Should().Be("RT-20260715-0001");
    }

    [Fact]
    public async Task GenerarCodigoRutaAsync_ConPrevios_DeberiaIncrementarSecuencia()
    {
        // Arrange — ya existe una ruta con el prefijo
        var fecha = new DateTime(2026, 7, 16, 0, 0, 0, DateTimeKind.Utc);
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = 700, TenantId = TenantId, UsuarioId = UsuarioId,
            Codigo = "RT-20260716-0003", Nombre = "Existente", Fecha = fecha,
            Estado = EstadoRuta.Planificada, Activo = true,
        });
        await _db.SaveChangesAsync();

        // Act
        var codigo = await _sut.GenerarCodigoRutaAsync(TenantId, fecha, esTemplate: false);

        // Assert
        codigo.Should().Be("RT-20260716-0004");
    }

    [Fact]
    public async Task BatchToggleActivoAsync_DeberiaCambiarActivoEnMultiplesRutasYRetornarCount()
    {
        // Arrange
        var fecha = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        AddRuta(801, fecha, activo: true);
        AddRuta(802, fecha, activo: true);
        AddRuta(803, fecha, activo: true);

        // Act — desactivar 2 de 3
        var count = await _sut.BatchToggleActivoAsync(new List<int> { 801, 802 }, activo: false, TenantId);

        // Assert
        count.Should().Be(2);
        var rutas = await _db.RutasVendedor.IgnoreQueryFilters().AsNoTracking()
            .Where(r => new[] { 801, 802, 803 }.Contains(r.Id))
            .ToListAsync();
        rutas.Single(r => r.Id == 801).Activo.Should().BeFalse();
        rutas.Single(r => r.Id == 802).Activo.Should().BeFalse();
        rutas.Single(r => r.Id == 803).Activo.Should().BeTrue();
    }

    [Fact]
    public async Task ObtenerRutasActivasParaMapaAsync_IncluyeRutaDeHoy_AunqueLaWindowTzEsteDesplazada()
    {
        // Regresión 2026-06-25 (rutas vacías en prod): RutaVendedor.Fecha es
        // date-only (medianoche UTC). El query "jornada" filtraba con la window
        // tz-shifted (México arranca 06:00 UTC) y excluía TODA ruta del día. El
        // fix usa GetCalendarDayWindowUtc (medianoche UTC). Simulamos un tenant
        // con offset negativo: si el código volviera a usar la window tz-shifted,
        // la ruta a medianoche UTC quedaría fuera y este test fallaría.
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        _tzMock.Setup(t => t.GetTenantDayWindowUtcAsync(It.IsAny<DateOnly?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync<DateOnly?, CancellationToken, ITenantTimeZoneService, (DateTime, DateTime)>((d, _) =>
            {
                var dia = d ?? hoy;
                var inicio = new DateTime(dia.Year, dia.Month, dia.Day, 6, 0, 0, DateTimeKind.Utc); // shift +6h
                return (inicio, inicio.AddDays(1));
            });

        var fechaMidnightUtc = new DateTime(hoy.Year, hoy.Month, hoy.Day, 0, 0, 0, DateTimeKind.Utc);
        AddRuta(900, fechaMidnightUtc, EstadoRuta.EnProgreso);

        var rutas = await _sut.ObtenerRutasActivasParaMapaAsync(TenantId, null);

        rutas.Should().Contain(r => r.Id == 900,
            "una ruta date-only de hoy (medianoche UTC) debe aparecer en la jornada aunque la window tz esté desplazada");
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
