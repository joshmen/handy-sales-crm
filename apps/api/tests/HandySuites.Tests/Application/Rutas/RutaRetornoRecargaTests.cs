using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories.Rutas;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Rutas;

/// <summary>
/// Tests para la columna `RecargaExterna` agregada al cierre de ruta.
///
/// Caso de uso real (prod 2026-05-30, tenant Jeyma): Inicial=480, Vendidos=744, Diferencia=-264.
/// Esto pasa cuando el vendedor recargó del almacén a mitad del día. Antes, los steppers
/// existentes (Mermas, RecAlmacen, CargaVehiculo) sólo restaban del Inicial — no había
/// forma de cuadrar overage. La columna RecargaExterna SUMA al Inicial efectivo.
///
/// Fórmula nueva:
///   Diferencia = (CantidadInicial + RecargaExterna) - Vendidos - Entregados - Devueltos
///              - Mermas - RecAlmacen - CargaVehiculo
/// </summary>
public class RutaRetornoRecargaTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;
    private readonly RutaVendedorRepository _sut;

    private const int TenantId = 1;
    private const int UsuarioId = 10;
    private const int RutaId = 100;
    private const int ProductoId = 200;

    public RutaRetornoRecargaTests()
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

        var tz = new Mock<ITenantTimeZoneService>();
        tz.Setup(t => t.GetTenantTimeZoneAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(TimeZoneInfo.Utc);
        _sut = new RutaVendedorRepository(_db, tz.Object);

        SeedFixtures();
    }

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test SA" });
        _db.Productos.Add(new Producto
        {
            Id = ProductoId, TenantId = TenantId, Nombre = "Salsa Tatemada",
            CodigoBarra = "ST-01", Descripcion = "Salsa", PrecioBase = 10m, Activo = true,
        });
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = RutaId, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "Ruta tatemada", Fecha = new DateTime(2026, 5, 30, 0, 0, 0, DateTimeKind.Utc),
            Estado = EstadoRuta.Completada, Activo = true,
        });
        _db.SaveChanges();
    }

    /// <summary>Sin recarga: la fórmula queda como antes (puede dar overage negativo).</summary>
    [Fact]
    public async Task ObtenerRetorno_SinRecargaConOverage_DiferenciaNegativa()
    {
        // Arrange — caso del bug reportado: 480 cargado, 744 vendido vía auto-attach huérfanos
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 1, TenantId = TenantId, RutaId = RutaId, ProductoId = ProductoId,
            CantidadEntrega = 0, CantidadVenta = 480, CantidadTotal = 480,
            CantidadVendida = 744, CantidadEntregada = 0, PrecioUnitario = 10, Activo = true,
        });
        await _db.SaveChangesAsync();

        // Act — primer call crea RutaRetornoInventario con CantidadInicial=480
        var resultado = await _sut.ObtenerRetornoInventarioAsync(RutaId, TenantId);

        // Assert
        resultado.Should().HaveCount(1);
        var item = resultado[0];
        item.CantidadInicial.Should().Be(480);
        item.Vendidos.Should().Be(744);
        item.RecargaExterna.Should().Be(0);
        // 480 + 0 - 744 - 0 - 0 - 0 - 0 - 0 = -264
        item.Diferencia.Should().Be(-264);
    }

    /// <summary>Con recarga del valor exacto del overage: Diferencia debe ser 0.</summary>
    [Fact]
    public async Task ActualizarRetorno_RecargaCubriendoOverage_DiferenciaCero()
    {
        // Arrange — mismo escenario del bug
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 2, TenantId = TenantId, RutaId = RutaId, ProductoId = ProductoId,
            CantidadEntrega = 0, CantidadVenta = 480, CantidadTotal = 480,
            CantidadVendida = 744, CantidadEntregada = 0, PrecioUnitario = 10, Activo = true,
        });
        await _db.SaveChangesAsync();

        // Crea el registro de retorno
        await _sut.ObtenerRetornoInventarioAsync(RutaId, TenantId);

        // Act — admin asigna 264 a Recarga vía stepper (resto en 0)
        await _sut.ActualizarRetornoAsync(RutaId, ProductoId, mermas: 0, recAlmacen: 0, cargaVehiculo: 0,
            recargaExterna: 264, tenantId: TenantId);

        // Assert — fórmula: (480 + 264) - 744 - 0 - 0 - 0 - 0 - 0 = 0
        var resultado = await _sut.ObtenerRetornoInventarioAsync(RutaId, TenantId);
        var item = resultado.Single();
        item.RecargaExterna.Should().Be(264);
        item.Diferencia.Should().Be(0);

        // Persiste en DB
        var entidad = await _db.RutasRetornoInventario.AsNoTracking()
            .FirstAsync(r => r.RutaId == RutaId && r.ProductoId == ProductoId);
        entidad.RecargaExterna.Should().Be(264);
        entidad.Diferencia.Should().Be(0);
    }

    /// <summary>Caso normal sin overage: Recarga=0 + algunas Mermas dan diferencia positiva.</summary>
    [Fact]
    public async Task ActualizarRetorno_SoloMermasSinRecarga_DiferenciaPositiva()
    {
        // Arrange — 100 cargados, 80 vendidos, 10 mermas → 10 sobran sin asignar
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 3, TenantId = TenantId, RutaId = RutaId, ProductoId = ProductoId,
            CantidadEntrega = 0, CantidadVenta = 100, CantidadTotal = 100,
            CantidadVendida = 80, CantidadEntregada = 0, PrecioUnitario = 10, Activo = true,
        });
        await _db.SaveChangesAsync();

        await _sut.ObtenerRetornoInventarioAsync(RutaId, TenantId);

        // Act
        await _sut.ActualizarRetornoAsync(RutaId, ProductoId, mermas: 10, recAlmacen: 0, cargaVehiculo: 0,
            recargaExterna: 0, tenantId: TenantId);

        // Assert — (100 + 0) - 80 - 0 - 0 - 10 - 0 - 0 = 10
        var resultado = await _sut.ObtenerRetornoInventarioAsync(RutaId, TenantId);
        resultado.Single().Diferencia.Should().Be(10);
    }

    /// <summary>Combinación: Recarga + ajustes restantes. Cierre completo.</summary>
    [Fact]
    public async Task ActualizarRetorno_RecargaYAjustesMixtos_DiferenciaCero()
    {
        // Arrange — 100 cargados, 120 vendidos (recargó 20), 5 mermas
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 4, TenantId = TenantId, RutaId = RutaId, ProductoId = ProductoId,
            CantidadEntrega = 0, CantidadVenta = 100, CantidadTotal = 100,
            CantidadVendida = 120, CantidadEntregada = 0, PrecioUnitario = 10, Activo = true,
        });
        await _db.SaveChangesAsync();

        await _sut.ObtenerRetornoInventarioAsync(RutaId, TenantId);

        // Act — recargó 25 (5 quedaron sin vender → mermas)
        await _sut.ActualizarRetornoAsync(RutaId, ProductoId, mermas: 5, recAlmacen: 0, cargaVehiculo: 0,
            recargaExterna: 25, tenantId: TenantId);

        // Assert — (100 + 25) - 120 - 0 - 0 - 5 - 0 - 0 = 0
        var resultado = await _sut.ObtenerRetornoInventarioAsync(RutaId, TenantId);
        var item = resultado.Single();
        item.RecargaExterna.Should().Be(25);
        item.Mermas.Should().Be(5);
        item.Diferencia.Should().Be(0);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
