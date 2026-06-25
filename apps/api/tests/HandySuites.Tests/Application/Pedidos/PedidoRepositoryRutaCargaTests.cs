using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Pedidos.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories.Pedidos;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Pedidos;

/// <summary>
/// Tests para el incremento automático de RutasCarga.CantidadVendida / CantidadEntregada
/// cuando un Pedido pasa a Entregado via PedidoRepository.CambiarEstadoDetalladoAsync.
///
/// Reportado prod 2026-05-26 (Rodrigo): la barra "Productos (vendidos + entregados)"
/// en mobile se quedaba en 0 porque el path web de marcar como entregado no incrementaba
/// los contadores, sólo los paths mobile (MobileVentaDirecta, MobilePedido, Sync push).
/// </summary>
public class PedidoRepositoryRutaCargaTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;
    private readonly PedidoRepository _sut;
    private readonly Mock<ITenantTimeZoneService> _tzMock;

    public PedidoRepositoryRutaCargaTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        // Disable FK enforcement — testeamos comportamiento del repo, no integridad
        // referencial completa. SeedFixtures sólo inserta lo necesario para la lógica
        // bajo prueba; las entidades dependientes (Zona, CategoriaCliente, etc.) no
        // existen ni son relevantes para el comportamiento de RutasCarga.
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
        _tzMock.Setup(t => t.GetTenantTodayMidnightUtcAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(DateTime.UtcNow.Date);
        // La imputación de VentaDirecta busca la ruta por la fecha-calendario del tenant del
        // pedido. Mock UTC por defecto (sin shift): día = fecha UTC, window = [día 00:00, +1).
        _tzMock.Setup(t => t.GetTenantDayFromUtcAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync<DateTime, CancellationToken, ITenantTimeZoneService, DateOnly>(
                (utc, _) => DateOnly.FromDateTime(utc));
        _tzMock.Setup(t => t.GetCalendarDayWindowUtc(It.IsAny<DateOnly>()))
            .Returns<DateOnly>(dia =>
            {
                var inicio = new DateTime(dia.Year, dia.Month, dia.Day, 0, 0, 0, DateTimeKind.Utc);
                return (inicio, inicio.AddDays(1));
            });
        _sut = new PedidoRepository(_db, _tzMock.Object);

        SeedFixtures();
    }

    private const int TenantId = 1;
    private const int UsuarioId = 10;
    private const int RutaId = 100;
    private const int ProductoId = 200;
    private const int ClienteId = 300;

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test SA" });
        _db.Productos.Add(new Producto
        {
            Id = ProductoId, TenantId = TenantId, Nombre = "Producto X",
            CodigoBarra = "X1", Descripcion = "Producto X desc",
            PrecioBase = 10m, Activo = true
        });
        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId, TenantId = TenantId, Nombre = "Cliente X",
            RFC = "XAXX010101000", Correo = "c@x.com", Telefono = "0", Direccion = "",
            Activo = true
        });
        _db.Usuarios.Add(new Usuario
        {
            Id = UsuarioId, TenantId = TenantId, Email = "v@test.com",
            Nombre = "Vendedor", PasswordHash = "x", RolExplicito = RoleNames.Vendedor, Activo = true
        });
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = RutaId, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "Ruta del día", Fecha = DateTime.UtcNow.Date,
            Estado = EstadoRuta.EnProgreso, Activo = true,
        });
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 500, TenantId = TenantId, RutaId = RutaId, ProductoId = ProductoId,
            CantidadEntrega = 50, CantidadVenta = 30, CantidadTotal = 80,
            CantidadVendida = 0, CantidadEntregada = 0, PrecioUnitario = 10, Activo = true,
        });
        _db.SaveChanges();
    }

    private Pedido CreatePedidoEnRuta(int id, TipoVenta tipoVenta, decimal cantidad)
    {
        var pedido = new Pedido
        {
            Id = id, TenantId = TenantId, ClienteId = ClienteId, UsuarioId = UsuarioId,
            NumeroPedido = $"PED-{id}", Estado = EstadoPedido.EnRuta,
            TipoVenta = tipoVenta, Subtotal = 0, Total = 0, Activo = true,
            FechaPedido = DateTime.UtcNow,
        };
        _db.Pedidos.Add(pedido);
        _db.DetallePedidos.Add(new DetallePedido
        {
            Id = id * 10, PedidoId = id, ProductoId = ProductoId,
            Cantidad = cantidad, PrecioUnitario = 10, Subtotal = cantidad * 10,
            Total = cantidad * 10, Activo = true,
        });
        _db.SaveChanges();
        return pedido;
    }

    private void AsignarPedidoARuta(int pedidoId)
    {
        _db.RutasPedidos.Add(new RutaPedido
        {
            TenantId = TenantId, RutaId = RutaId, PedidoId = pedidoId,
            Estado = EstadoPedidoRuta.Asignado, Activo = true,
        });
        _db.SaveChanges();
    }

    [Fact]
    public async Task CambiarAEntregado_PreventaConRutaPedido_IncrementaCantidadEntregada()
    {
        // Arrange — preventa pre-asignada a la ruta del día
        CreatePedidoEnRuta(id: 1001, TipoVenta.Preventa, cantidad: 7);
        AsignarPedidoARuta(1001);

        // Act
        var outcome = await _sut.CambiarEstadoDetalladoAsync(1001, EstadoPedido.Entregado, null, TenantId);

        // Assert
        outcome.Status.Should().Be(CambiarEstadoStatus.Ok);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadEntregada.Should().Be(7);
        carga.CantidadVendida.Should().Be(0); // no debe tocar la otra
    }

    [Fact]
    public async Task CambiarAEntregado_VentaDirectaSinPrelink_IncrementaCantidadVendidaEnRutaActiva()
    {
        // Arrange — venta directa NO pre-asignada; debe encontrar la ruta activa del vendedor
        CreatePedidoEnRuta(id: 1002, TipoVenta.VentaDirecta, cantidad: 3);
        // No AsignarPedidoARuta — flow venta directa

        // Act
        var outcome = await _sut.CambiarEstadoDetalladoAsync(1002, EstadoPedido.Entregado, null, TenantId);

        // Assert
        outcome.Status.Should().Be(CambiarEstadoStatus.Ok);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadVendida.Should().Be(3);
        carga.CantidadEntregada.Should().Be(0);
    }

    [Fact]
    public async Task CambiarAEntregado_SinRutaActiva_NoCambiaRutaCarga()
    {
        // Arrange — la ruta queda en estado Completada (no activa), venta directa sin prelink
        var ruta = await _db.RutasVendedor.FirstAsync(r => r.Id == RutaId);
        ruta.Estado = EstadoRuta.Completada;
        await _db.SaveChangesAsync();

        CreatePedidoEnRuta(id: 1003, TipoVenta.VentaDirecta, cantidad: 5);

        // Act
        var outcome = await _sut.CambiarEstadoDetalladoAsync(1003, EstadoPedido.Entregado, null, TenantId);

        // Assert
        outcome.Status.Should().Be(CambiarEstadoStatus.Ok);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadVendida.Should().Be(0);
        carga.CantidadEntregada.Should().Be(0);
    }

    [Fact]
    public async Task CambiarAEntregado_VentaDirectaDeAyer_NoImputaARutaDeHoy()
    {
        // Reproduce el bug Rodrigo 27/5/2026 (cross-contamination entre rutas de días distintos).
        // ANTES del fix: un pedido de ayer entregado hoy buscaba CUALQUIER ruta activa sin
        // acotar por fecha → se imputaba a la ruta de hoy, inflando su CantidadVendida.
        // POST-fix: la búsqueda acota por la fecha-calendario del tenant del pedido == r.Fecha
        // — no encuentra ruta para el pedido de ayer, no incrementa nada.

        // Arrange — pedido VentaDirecta con FechaPedido=ayer; ruta del día es de hoy.
        var pedido = CreatePedidoEnRuta(id: 1004, TipoVenta.VentaDirecta, cantidad: 9);
        pedido.FechaPedido = DateTime.UtcNow.Date.AddDays(-1).AddHours(15); // ayer 3pm UTC
        await _db.SaveChangesAsync();

        // Act
        var outcome = await _sut.CambiarEstadoDetalladoAsync(1004, EstadoPedido.Entregado, null, TenantId);

        // Assert — pedido entregado OK pero no impacta ruta de hoy
        outcome.Status.Should().Be(CambiarEstadoStatus.Ok);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadVendida.Should().Be(0);
        carga.CantidadEntregada.Should().Be(0);
    }

    [Fact]
    public async Task CambiarAEntregado_VentaDirectaNocturna_MexicoTz_ImputaARutaDelDiaLocal()
    {
        // Regresión 2026-06-25 (cierre de ruta mostraba "Vendió 10" con 59 ventas reales):
        // una venta directa de la noche en México (UTC-6) tiene FechaPedido al día UTC
        // SIGUIENTE. Con .Date la imputación buscaba la ruta del día UTC siguiente y NO
        // encontraba la ruta de hoy -> CantidadVendida nunca se incrementaba para las ventas
        // de la tarde/noche. El fix usa la fecha-calendario del tenant (GetTenantDayFromUtcAsync).
        // Si alguien revierte a .Date, este test falla.

        // Mock tz México: convierte el instante UTC a la fecha-calendario local (-6h).
        _tzMock.Setup(t => t.GetTenantDayFromUtcAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync<DateTime, CancellationToken, ITenantTimeZoneService, DateOnly>(
                (utc, _) => DateOnly.FromDateTime(utc.AddHours(-6)));

        // Ruta del día LOCAL 2026-06-23 (date-only a medianoche UTC), en progreso.
        var diaLocal = new DateTime(2026, 6, 23, 0, 0, 0, DateTimeKind.Utc);
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = 110, TenantId = TenantId, UsuarioId = UsuarioId,
            Codigo = "RT-20260623-0110",
            Nombre = "Ruta 23", Fecha = diaLocal, Estado = EstadoRuta.EnProgreso, Activo = true,
        });
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 510, TenantId = TenantId, RutaId = 110, ProductoId = ProductoId,
            CantidadEntrega = 50, CantidadVenta = 30, CantidadTotal = 80,
            CantidadVendida = 0, CantidadEntregada = 0, PrecioUnitario = 10, Activo = true,
        });
        await _db.SaveChangesAsync();

        // Venta directa de la noche: 2026-06-23 20:00 México = 2026-06-24 02:00 UTC.
        var pedido = CreatePedidoEnRuta(id: 1006, TipoVenta.VentaDirecta, cantidad: 4);
        pedido.FechaPedido = new DateTime(2026, 6, 24, 2, 0, 0, DateTimeKind.Utc);
        await _db.SaveChangesAsync();

        // Act
        var outcome = await _sut.CambiarEstadoDetalladoAsync(1006, EstadoPedido.Entregado, null, TenantId);

        // Assert — la venta nocturna se imputa a la ruta del día local 23, no se pierde.
        outcome.Status.Should().Be(CambiarEstadoStatus.Ok);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == 110);
        carga.CantidadVendida.Should().Be(4);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
