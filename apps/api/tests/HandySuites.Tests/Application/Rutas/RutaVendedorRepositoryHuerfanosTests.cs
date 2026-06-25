using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories.Rutas;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Rutas;

/// <summary>
/// Tests para VincularPedidosHuerfanosAsync — sweep retroactivo al aceptar/iniciar
/// ruta. Caso reportado prod 2026-05-26 (Rodrigo): vendedor empieza a vender pre-ruta,
/// admin asigna ruta cargada después → las ventas deberían sumarse a esa ruta.
/// </summary>
public class RutaVendedorRepositoryHuerfanosTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;
    private readonly RutaVendedorRepository _sut;

    private const int TenantId = 1;
    private const int UsuarioId = 10;
    private const int OtroUsuarioId = 11;
    private const int RutaId = 100;
    private const int ProductoId = 200;
    private const int ClienteId = 300;

    public RutaVendedorRepositoryHuerfanosTests()
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
        // El sweep filtra p.FechaPedido (timestamp real) con la ventana tz-shifted del día
        // de la ruta. Mock UTC por defecto: window = [día 00:00 UTC, +1).
        tz.Setup(t => t.GetTenantDayWindowUtcAsync(It.IsAny<DateOnly?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync<DateOnly?, CancellationToken, ITenantTimeZoneService, (DateTime, DateTime)>((d, _) =>
            {
                var dia = d ?? DateOnly.FromDateTime(DateTime.UtcNow);
                var inicio = new DateTime(dia.Year, dia.Month, dia.Day, 0, 0, 0, DateTimeKind.Utc);
                return (inicio, inicio.AddDays(1));
            });
        _sut = new RutaVendedorRepository(_db, tz.Object);

        SeedFixtures();
    }

    private DateTime HoyFecha => new DateTime(2026, 5, 26, 0, 0, 0, DateTimeKind.Utc);

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
        _db.RutasVendedor.Add(new RutaVendedor
        {
            Id = RutaId, TenantId = TenantId, UsuarioId = UsuarioId,
            Nombre = "Ruta del día", Fecha = HoyFecha,
            Estado = EstadoRuta.CargaAceptada, Activo = true,
        });
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 500, TenantId = TenantId, RutaId = RutaId, ProductoId = ProductoId,
            CantidadEntrega = 50, CantidadVenta = 30, CantidadTotal = 80,
            CantidadVendida = 0, CantidadEntregada = 0, PrecioUnitario = 10, Activo = true,
        });
        _db.SaveChanges();
    }

    private Pedido CreatePedidoEntregado(int id, int usuarioId, DateTime fechaPedido, decimal cantidad,
        TipoVenta tipo = TipoVenta.VentaDirecta)
    {
        var pedido = new Pedido
        {
            Id = id, TenantId = TenantId, ClienteId = ClienteId, UsuarioId = usuarioId,
            NumeroPedido = $"PED-{id}", Estado = EstadoPedido.Entregado,
            TipoVenta = tipo, Subtotal = 0, Total = 0, Activo = true,
            FechaPedido = fechaPedido,
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

    [Fact]
    public async Task VincularHuerfanos_PedidoVentaDirectaDelDia_SeVinculaYSumaCantidadVendida()
    {
        // Arrange — pedido VentaDirecta+Entregado del mismo usuario+día, sin RutasPedidos link
        CreatePedidoEntregado(id: 2001, UsuarioId, HoyFecha.AddHours(10), cantidad: 7);

        // Act
        var result = await _sut.VincularPedidosHuerfanosAsync(RutaId, TenantId);

        // Assert
        result.PedidosVinculados.Should().Be(1);
        result.UnidadesTotales.Should().Be(7);

        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadVendida.Should().Be(7);

        // Link creado para idempotencia
        var link = await _db.RutasPedidos.AsNoTracking()
            .FirstOrDefaultAsync(rp => rp.PedidoId == 2001 && rp.RutaId == RutaId);
        link.Should().NotBeNull();
        link!.Activo.Should().BeTrue();
    }

    [Fact]
    public async Task VincularHuerfanos_ConRutasPedidosLinkExistente_NoDuplicaIdempotente()
    {
        // Arrange — pedido con link existente (ya vinculado a esta misma ruta o a otra)
        CreatePedidoEntregado(id: 2002, UsuarioId, HoyFecha.AddHours(11), cantidad: 5);
        _db.RutasPedidos.Add(new RutaPedido
        {
            RutaId = RutaId, PedidoId = 2002, TenantId = TenantId,
            Estado = EstadoPedidoRuta.Entregado, Activo = true,
        });
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.VincularPedidosHuerfanosAsync(RutaId, TenantId);

        // Assert — no toca nada porque ya estaba vinculado
        result.PedidosVinculados.Should().Be(0);
        result.UnidadesTotales.Should().Be(0);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadVendida.Should().Be(0);
    }

    [Fact]
    public async Task VincularHuerfanos_PedidoOtroDia_NoSeVincula()
    {
        // Arrange — pedido del usuario correcto pero de OTRO día
        var ayer = HoyFecha.AddDays(-1).AddHours(15);
        CreatePedidoEntregado(id: 2003, UsuarioId, ayer, cantidad: 3);

        // Act
        var result = await _sut.VincularPedidosHuerfanosAsync(RutaId, TenantId);

        // Assert
        result.PedidosVinculados.Should().Be(0);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadVendida.Should().Be(0);
    }

    [Fact]
    public async Task VincularHuerfanos_PedidoDeOtroUsuario_NoSeVincula()
    {
        // Arrange — pedido del día y de TipoVenta correctos pero de otro vendedor
        CreatePedidoEntregado(id: 2004, OtroUsuarioId, HoyFecha.AddHours(10), cantidad: 9);

        // Act
        var result = await _sut.VincularPedidosHuerfanosAsync(RutaId, TenantId);

        // Assert
        result.PedidosVinculados.Should().Be(0);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadVendida.Should().Be(0);
    }

    [Fact]
    public async Task VincularHuerfanos_PedidoPreventa_NoSeVincula()
    {
        // Arrange — preventa Entregado: la lógica del sweep solo aplica a VentaDirecta
        // (los preventa deberían tener RutasPedidos link explícito al asignarlos).
        CreatePedidoEntregado(id: 2005, UsuarioId, HoyFecha.AddHours(10), cantidad: 4, tipo: TipoVenta.Preventa);

        // Act
        var result = await _sut.VincularPedidosHuerfanosAsync(RutaId, TenantId);

        // Assert
        result.PedidosVinculados.Should().Be(0);
    }

    [Fact]
    public async Task VincularHuerfanos_VentaNocturnaMexicoTz_SeVinculaAunqueCaeDiaUtcSiguiente()
    {
        // Regresión 2026-06-25 (cierre subcontaba "Vendió"): una venta de la noche en México
        // (UTC-6) tiene FechaPedido en el día UTC SIGUIENTE. Con .Date la ventana del sweep era
        // [medianoche UTC, +1) y la dejaba fuera -> huérfano no recuperado. El fix usa la ventana
        // tz-shifted del día de la ruta (GetTenantDayWindowUtcAsync). Si se revierte a .Date, falla.
        var tz = new Mock<ITenantTimeZoneService>();
        tz.Setup(t => t.GetTenantTimeZoneAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(TimeZoneInfo.Utc);
        tz.Setup(t => t.GetTenantDayWindowUtcAsync(It.IsAny<DateOnly?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync<DateOnly?, CancellationToken, ITenantTimeZoneService, (DateTime, DateTime)>((d, _) =>
            {
                var dia = d ?? DateOnly.FromDateTime(DateTime.UtcNow);
                var inicio = new DateTime(dia.Year, dia.Month, dia.Day, 6, 0, 0, DateTimeKind.Utc); // México UTC-6
                return (inicio, inicio.AddDays(1));
            });
        var sut = new RutaVendedorRepository(_db, tz.Object);

        // Venta nocturna: 2026-05-26 20:00 México = 2026-05-27 02:00 UTC (cae al día UTC siguiente).
        CreatePedidoEntregado(id: 2010, UsuarioId, new DateTime(2026, 5, 27, 2, 0, 0, DateTimeKind.Utc), cantidad: 6);

        // Act
        var result = await sut.VincularPedidosHuerfanosAsync(RutaId, TenantId);

        // Assert — la venta de la noche se vincula a la ruta del día y suma a CantidadVendida.
        result.PedidosVinculados.Should().Be(1);
        result.UnidadesTotales.Should().Be(6);
        var carga = await _db.RutasCarga.AsNoTracking().FirstAsync(c => c.RutaId == RutaId);
        carga.CantidadVendida.Should().Be(6);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
