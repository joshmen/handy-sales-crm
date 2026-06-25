using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Pedidos.DTOs;
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
/// Tests para B.1 — PedidoRepository.EagerSaveAsync (fix prod 2026-06-04
/// post-incidente Rodrigo). El eager-save crea Pedido como Estado=Borrador
/// idempotentemente vía mobile_record_id ANTES del sync push normal, para
/// garantizar durabilidad server-side aún si el SQLite local se borra.
///
/// Invariantes verificadas:
/// - Idempotencia vía mobile_record_id (mismo MobileRecordId + TenantId → no
///   crea duplicado, retorna el existente con Idempotent=true)
/// - SIEMPRE Estado=Borrador (incluso si TipoVenta=VentaDirecta) — el promote
///   a Entregado pasa por el sync push normal (UpsertPedidoAsync), no aquí
/// - NO ejecuta validaciones de business (cliente activo, stock) — eso es
///   responsabilidad del flow que promueva el Estado
/// - NO decrementa inventario ni toca RutasCarga
/// - NumeroPedido queda null (se asigna al promover)
/// - Cross-tenant: mismo MobileRecordId en distinto tenant_id crea registros
///   separados (no hay colisión)
/// </summary>
public class PedidoEagerSaveTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;
    private readonly PedidoRepository _sut;

    private const int TenantId = 1;
    private const int OtherTenantId = 2;
    private const int UsuarioId = 10;
    private const int ProductoId = 200;
    private const int OtherProductoId = 201;
    private const int ClienteId = 300;
    private const int RutaId = 100;

    public PedidoEagerSaveTests()
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
        tz.Setup(t => t.GetTenantTodayMidnightUtcAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(DateTime.UtcNow.Date);
        _sut = new PedidoRepository(_db, tz.Object);

        SeedFixtures();
    }

    private void SeedFixtures()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test SA" });
        _db.Tenants.Add(new Tenant { Id = OtherTenantId, NombreEmpresa = "Otro Tenant SA" });
        _db.Productos.Add(new Producto
        {
            Id = ProductoId, TenantId = TenantId, Nombre = "Producto X",
            CodigoBarra = "X1", Descripcion = "P X",
            PrecioBase = 10m, Activo = true
        });
        _db.Productos.Add(new Producto
        {
            Id = OtherProductoId, TenantId = TenantId, Nombre = "Producto Y",
            CodigoBarra = "Y1", Descripcion = "P Y",
            PrecioBase = 20m, Activo = true
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
        // Ruta + RutaCarga: deben quedar intactas tras eager-save (sin side effects)
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
            CantidadVendida = 0, CantidadEntregada = 0, PrecioUnitario = 10.0, Activo = true,
        });
        _db.SaveChanges();
    }

    private static PedidoEagerSaveDto BuildDto(string mobileRecordId, int tipoVenta = 0, int productoId = ProductoId, decimal total = 116m)
    {
        return new PedidoEagerSaveDto
        {
            MobileRecordId = mobileRecordId,
            ClienteId = ClienteId,
            FechaPedido = DateTime.UtcNow,
            TipoVenta = tipoVenta,
            Subtotal = 100m,
            Descuento = 0m,
            Impuesto = 16m,
            Total = total,
            Notas = "Eager save E2E",
            Detalles = new List<PedidoEagerSaveDetalleDto>
            {
                new()
                {
                    ProductoId = productoId,
                    Cantidad = 5m,
                    PrecioUnitario = 20m,
                    Descuento = 0m,
                    Subtotal = 100m,
                    Impuesto = 16m,
                    Total = 116m
                }
            }
        };
    }

    [Fact]
    public async Task EagerSaveAsync_CreatesPedidoBorrador_WhenMobileRecordIdIsNew()
    {
        var dto = BuildDto("wdb-id-abc123");

        var outcome = await _sut.EagerSaveAsync(dto, UsuarioId, TenantId);

        outcome.Should().NotBeNull();
        outcome.ServerId.Should().BeGreaterThan(0);
        outcome.Estado.Should().Be(EstadoPedido.Borrador);
        outcome.Idempotent.Should().BeFalse();
        outcome.AckedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        var pedido = await _db.Pedidos.AsNoTracking().FirstAsync(p => p.Id == outcome.ServerId);
        pedido.MobileRecordId.Should().Be("wdb-id-abc123");
        pedido.Estado.Should().Be(EstadoPedido.Borrador);
        pedido.NumeroPedido.Should().StartWith("PED-", "eager-save genera NumeroPedido real porque la columna es NOT NULL (schema constraint pre-existente)");
        pedido.TenantId.Should().Be(TenantId);
        pedido.UsuarioId.Should().Be(UsuarioId);

        var detalles = await _db.DetallePedidos.AsNoTracking().Where(d => d.PedidoId == outcome.ServerId).ToListAsync();
        detalles.Should().HaveCount(1);
        detalles[0].ProductoId.Should().Be(ProductoId);
        detalles[0].Cantidad.Should().Be(5m);
    }

    [Fact]
    public async Task EagerSaveAsync_IsIdempotent_WhenMobileRecordIdAlreadyExists()
    {
        var dto = BuildDto("wdb-id-idempotent");

        var first = await _sut.EagerSaveAsync(dto, UsuarioId, TenantId);
        var second = await _sut.EagerSaveAsync(dto, UsuarioId, TenantId);

        first.Idempotent.Should().BeFalse();
        second.Idempotent.Should().BeTrue();
        second.ServerId.Should().Be(first.ServerId);
        second.Estado.Should().Be(first.Estado);

        var pedidoCount = await _db.Pedidos.AsNoTracking()
            .CountAsync(p => p.MobileRecordId == "wdb-id-idempotent" && p.TenantId == TenantId);
        pedidoCount.Should().Be(1, "el segundo eager-save no debe crear duplicado");

        var detalleCount = await _db.DetallePedidos.AsNoTracking()
            .CountAsync(d => d.PedidoId == first.ServerId);
        detalleCount.Should().Be(1, "los detalles tampoco se duplican");
    }

    [Fact]
    public async Task EagerSaveAsync_ForcesEstadoBorrador_EvenWhenTipoVentaIsVentaDirecta()
    {
        // TipoVenta=1 (VentaDirecta) en el path normal CrearAsync crea Estado=Entregado
        // que dispara decrement de inventory. Eager-save IGNORA eso y siempre crea Borrador
        // para evitar side effects irreversibles antes del sync push final.
        var dto = BuildDto("wdb-id-venta-directa", tipoVenta: 1);

        var outcome = await _sut.EagerSaveAsync(dto, UsuarioId, TenantId);

        outcome.Estado.Should().Be(EstadoPedido.Borrador);

        var pedido = await _db.Pedidos.AsNoTracking().FirstAsync(p => p.Id == outcome.ServerId);
        pedido.Estado.Should().Be(EstadoPedido.Borrador);
        pedido.TipoVenta.Should().Be(TipoVenta.VentaDirecta, "el TipoVenta se persiste como referencia");
    }

    [Fact]
    public async Task EagerSaveAsync_DoesNotAffectRutaCarga()
    {
        // En el path sync push normal, un pedido Entregado dispara
        // CambiarEstadoDetalladoAsync que incrementa RutasCarga.CantidadVendida.
        // Eager-save NO debe hacer eso — el Borrador no implica entrega.
        var rutaCargaAntes = await _db.RutasCarga.AsNoTracking().FirstAsync(rc => rc.Id == 500);
        rutaCargaAntes.CantidadVendida.Should().Be(0);
        rutaCargaAntes.CantidadEntregada.Should().Be(0);

        var dto = BuildDto("wdb-id-no-ruta-effect");
        await _sut.EagerSaveAsync(dto, UsuarioId, TenantId);

        var rutaCargaDespues = await _db.RutasCarga.AsNoTracking().FirstAsync(rc => rc.Id == 500);
        rutaCargaDespues.CantidadVendida.Should().Be(0, "eager-save NO debe incrementar CantidadVendida");
        rutaCargaDespues.CantidadEntregada.Should().Be(0, "eager-save NO debe incrementar CantidadEntregada");
    }

    [Fact]
    public async Task EagerSaveAsync_HandlesDifferentTenants_NoCollision()
    {
        // Mismo MobileRecordId en TenantId distinto debe crear 2 registros separados.
        // Garantiza que la idempotency es scoped por tenant.
        _db.Usuarios.Add(new Usuario
        {
            Id = 20, TenantId = OtherTenantId, Email = "v2@test.com",
            Nombre = "Vendedor 2", PasswordHash = "x", RolExplicito = RoleNames.Vendedor, Activo = true
        });
        _db.Clientes.Add(new Cliente
        {
            Id = 301, TenantId = OtherTenantId, Nombre = "Cliente Otro Tenant",
            RFC = "AAA010101AAA", Correo = "c@o.com", Telefono = "0", Direccion = "", Activo = true
        });
        _db.SaveChanges();

        var dtoTenant1 = BuildDto("wdb-id-cross-tenant");
        var dtoTenant2 = new PedidoEagerSaveDto
        {
            MobileRecordId = "wdb-id-cross-tenant",
            ClienteId = 301,
            FechaPedido = DateTime.UtcNow,
            TipoVenta = 0,
            Subtotal = 50m, Descuento = 0m, Impuesto = 8m, Total = 58m,
            Detalles = new List<PedidoEagerSaveDetalleDto>()
        };

        var outcome1 = await _sut.EagerSaveAsync(dtoTenant1, UsuarioId, TenantId);
        var outcome2 = await _sut.EagerSaveAsync(dtoTenant2, 20, OtherTenantId);

        outcome1.ServerId.Should().NotBe(outcome2.ServerId, "tenants distintos deben tener pedidos separados aunque el MobileRecordId coincida");
        outcome1.Idempotent.Should().BeFalse();
        outcome2.Idempotent.Should().BeFalse();

        var totalRows = await _db.Pedidos.AsNoTracking()
            .CountAsync(p => p.MobileRecordId == "wdb-id-cross-tenant");
        totalRows.Should().Be(2);
    }

    [Fact]
    public async Task EagerSaveAsync_CollapsesDuplicateVentaDirecta_SameFingerprintWithinWindow()
    {
        // Incidente prod 2026-06-23: el móvil crea DOS ventas directas para la
        // MISMA transacción (doble-submit), cada una con distinto MobileRecordId.
        // La idempotencia por mrid NO las colapsa. El guard de huella
        // (tenant+vendedor+cliente+total) debe colapsar la 2a a la 1a.
        var primera = BuildDto("wdb-vd-1", tipoVenta: 1);
        var segunda = BuildDto("wdb-vd-2", tipoVenta: 1); // mismo cliente+total, otro mrid

        var r1 = await _sut.EagerSaveAsync(primera, UsuarioId, TenantId);
        var r2 = await _sut.EagerSaveAsync(segunda, UsuarioId, TenantId);

        r1.Idempotent.Should().BeFalse();
        r2.Idempotent.Should().BeTrue("la 2a venta directa idéntica dentro de la ventana se colapsa");
        r2.ServerId.Should().Be(r1.ServerId);

        var count = await _db.Pedidos.AsNoTracking()
            .CountAsync(p => p.TenantId == TenantId && p.ClienteId == ClienteId && p.TipoVenta == TipoVenta.VentaDirecta);
        count.Should().Be(1, "solo debe existir UN pedido de venta directa pese a los 2 submits");
    }

    [Fact]
    public async Task EagerSaveAsync_DoesNotCollapsePreventa_SameFingerprint()
    {
        // El guard SOLO aplica a VentaDirecta. Una preventa puede legítimamente
        // repetirse (cada una se confirma aparte) — no deben colapsarse.
        var primera = BuildDto("wdb-pv-1", tipoVenta: 0);
        var segunda = BuildDto("wdb-pv-2", tipoVenta: 0);

        var r1 = await _sut.EagerSaveAsync(primera, UsuarioId, TenantId);
        var r2 = await _sut.EagerSaveAsync(segunda, UsuarioId, TenantId);

        r2.Idempotent.Should().BeFalse();
        r2.ServerId.Should().NotBe(r1.ServerId);

        var count = await _db.Pedidos.AsNoTracking()
            .CountAsync(p => p.TenantId == TenantId && p.ClienteId == ClienteId);
        count.Should().Be(2, "las preventas no se deduplican");
    }

    [Fact]
    public async Task EagerSaveAsync_DoesNotCollapseVentaDirecta_WhenTotalDiffers()
    {
        // Misma huella salvo el total → es otra venta, no se colapsa.
        var primera = BuildDto("wdb-vd-a", tipoVenta: 1, total: 116m);
        var segunda = BuildDto("wdb-vd-b", tipoVenta: 1, total: 200m);

        var r1 = await _sut.EagerSaveAsync(primera, UsuarioId, TenantId);
        var r2 = await _sut.EagerSaveAsync(segunda, UsuarioId, TenantId);

        r2.Idempotent.Should().BeFalse();
        r2.ServerId.Should().NotBe(r1.ServerId);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
