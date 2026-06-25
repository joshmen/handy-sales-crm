using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Sync.DTOs;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories.Sync;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HandySuites.Tests.Infrastructure.Sync;

/// <summary>
/// Tests para SyncRepository — verifican el comportamiento delta-pull, push con
/// conflict detection (server-wins), idempotency por MobileRecordId, soft-delete
/// via Activo=false, y dedupe en upserts.
/// </summary>
public class SyncRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly HandySuitesDbContext _db;
    private readonly SyncRepository _sut;

    private const int TenantId = 1;
    private const int OtherTenantId = 2;
    private const int UsuarioId = 10;
    private const int ProductoId = 200;
    private const int ClienteId = 300;

    public SyncRepositoryTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        // FK off — testeamos el comportamiento del repo, no integridad referencial.
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
        // La imputación de VentaDirecta (ambos paths de sync) busca la ruta por la
        // fecha-calendario del tenant del pedido. Mock UTC por defecto (sin shift).
        tz.Setup(t => t.GetTenantDayFromUtcAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync<DateTime, CancellationToken, ITenantTimeZoneService, DateOnly>(
                (utc, _) => DateOnly.FromDateTime(utc));
        tz.Setup(t => t.GetCalendarDayWindowUtc(It.IsAny<DateOnly>()))
            .Returns<DateOnly>(dia =>
            {
                var inicio = new DateTime(dia.Year, dia.Month, dia.Day, 0, 0, 0, DateTimeKind.Utc);
                return (inicio, inicio.AddDays(1));
            });
        _sut = new SyncRepository(_db, tz.Object);

        SeedTestData();
    }

    private void SeedTestData()
    {
        _db.Tenants.Add(new Tenant { Id = TenantId, NombreEmpresa = "Test SA" });
        _db.Tenants.Add(new Tenant { Id = OtherTenantId, NombreEmpresa = "Other SA" });

        _db.Productos.Add(new Producto
        {
            Id = ProductoId,
            TenantId = TenantId,
            Nombre = "Producto X",
            CodigoBarra = "X1",
            Descripcion = "desc",
            PrecioBase = 100m,
            PrecioIncluyeIva = true,
            Activo = true,
        });

        _db.Clientes.Add(new Cliente
        {
            Id = ClienteId,
            TenantId = TenantId,
            Nombre = "Cliente Existente",
            RFC = "XAXX010101000",
            Correo = "c@x.com",
            Telefono = "0",
            Direccion = "",
            Activo = true,
            Version = 1,
        });

        _db.Usuarios.Add(new Usuario
        {
            Id = UsuarioId,
            TenantId = TenantId,
            Email = "v@test.com",
            Nombre = "Vendedor",
            PasswordHash = "x",
            RolExplicito = RoleNames.Vendedor,
            Activo = true,
        });

        _db.SaveChanges();
    }

    // === GetClientesModifiedSinceAsync ===

    [Fact]
    public async Task GetClientesModifiedSince_SinSince_DeberiaRetornarTodosDelTenant()
    {
        // Add a client for another tenant (must be filtered out)
        _db.Clientes.Add(new Cliente
        {
            Id = 999, TenantId = OtherTenantId, Nombre = "Otro", RFC = "X", Correo = "x", Telefono = "0",
            Direccion = "", Activo = true, Version = 1,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetClientesModifiedSinceAsync(TenantId, since: null);

        result.Should().HaveCount(1);
        result[0].Id.Should().Be(ClienteId);
    }

    [Fact]
    public async Task GetClientesModifiedSince_ConSince_DeberiaFiltrarPorActualizadoEn()
    {
        var cutoff = DateTime.UtcNow.AddHours(-1);

        // HandySalesDbContext.SaveChangesAsync override forces ActualizadoEn = UtcNow on Modified
        // entities, which would clobber any value we set via the ChangeTracker. ExecuteUpdateAsync
        // runs as raw UPDATE that bypasses the SaveChanges interceptor.
        var backdated = DateTime.UtcNow.AddDays(-2);
        await _db.Clientes
            .Where(c => c.Id == ClienteId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.CreadoEn, backdated)
                .SetProperty(c => c.ActualizadoEn, backdated));

        var result = await _sut.GetClientesModifiedSinceAsync(TenantId, cutoff);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetClientesModifiedSince_ConSinceMasNuevoQueRegistro_IncluyeRegistroRecien()
    {
        var cutoff = DateTime.UtcNow.AddHours(-1);

        _db.Clientes.Add(new Cliente
        {
            Id = 1001, TenantId = TenantId, Nombre = "Nuevo", RFC = "X", Correo = "x", Telefono = "0",
            Direccion = "", Activo = true, Version = 1,
            CreadoEn = DateTime.UtcNow, // recent
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetClientesModifiedSinceAsync(TenantId, cutoff);

        result.Should().Contain(c => c.Id == 1001);
    }

    // === UpsertClienteAsync — Create ===

    [Fact]
    public async Task UpsertCliente_NuevoSinId_DeberiaCrearYAsignarVersion1()
    {
        var dto = new SyncClienteDto
        {
            Id = 0,
            LocalId = "wdb-cli-1",
            Nombre = "Nuevo Cliente",
            RFC = "RFCX",
            Correo = "n@x.com",
            Telefono = "555",
            Direccion = "Calle 1",
            Activo = true,
            Operation = SyncOperation.Create,
        };

        var (entity, conflict) = await _sut.UpsertClienteAsync(TenantId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        conflict.Should().BeFalse();
        entity.Id.Should().BeGreaterThan(0);
        entity.Nombre.Should().Be("Nuevo Cliente");
        entity.MobileRecordId.Should().Be("wdb-cli-1");
        entity.Version.Should().Be(1);
        entity.VendedorId.Should().Be(10);
    }

    [Fact]
    public async Task UpsertCliente_LocalIdDuplicado_DeberiaRetornarExistente()
    {
        // Seed an existing client created from mobile previously
        _db.Clientes.Add(new Cliente
        {
            Id = 5000, TenantId = TenantId, Nombre = "Existe", RFC = "X", Correo = "x", Telefono = "0",
            Direccion = "", Activo = true, Version = 1, MobileRecordId = "wdb-dupe",
        });
        await _db.SaveChangesAsync();

        var dto = new SyncClienteDto
        {
            Id = 0,
            LocalId = "wdb-dupe",
            Nombre = "Should be ignored",
            RFC = "X", Correo = "x", Telefono = "0", Direccion = "",
            Operation = SyncOperation.Create,
        };

        var (entity, conflict) = await _sut.UpsertClienteAsync(TenantId, dto, userId: "10");

        conflict.Should().BeFalse();
        entity.Id.Should().Be(5000);
        entity.Nombre.Should().Be("Existe"); // didn't overwrite
    }

    // === UpsertClienteAsync — Update / Conflict ===

    [Fact]
    public async Task UpsertCliente_VersionMismatch_DeberiaMarcarConflict()
    {
        var dto = new SyncClienteDto
        {
            Id = ClienteId,
            Nombre = "Tried update",
            RFC = "X", Correo = "x", Telefono = "0", Direccion = "",
            Version = 99, // wrong — server has 1
            Operation = SyncOperation.Update,
        };

        var (entity, conflict) = await _sut.UpsertClienteAsync(TenantId, dto, userId: "10");

        conflict.Should().BeTrue();
        entity.Id.Should().Be(ClienteId);
        entity.Nombre.Should().Be("Cliente Existente"); // server-wins, no overwrite
    }

    [Fact]
    public async Task UpsertCliente_UpdateConVersionCorrecta_DeberiaActualizarYIncrementarVersion()
    {
        var dto = new SyncClienteDto
        {
            Id = ClienteId,
            Nombre = "Actualizado",
            RFC = "RFCN", Correo = "new@x.com", Telefono = "999", Direccion = "Nueva",
            Version = 1, // matches server
            Activo = true,
            Operation = SyncOperation.Update,
        };

        var (entity, conflict) = await _sut.UpsertClienteAsync(TenantId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        conflict.Should().BeFalse();
        entity.Nombre.Should().Be("Actualizado");
        // Version bump is owned by HandySalesDbContext.SaveChangesAsync interceptor (1→2 on Modified).
        // SyncRepository no longer increments manually — see audit finding 4.14 (double-bump fix).
        entity.Version.Should().Be(2);
        // Note: SaveChangesAsync override sets ActualizadoPor = _tenantContext?.CurrentUserEmail.
        // Tests instantiate HandySalesDbContext without a tenant context, so the userId="10"
        // value the repo wrote is overwritten with null. In production the tenant context
        // provides the current user's email.
    }

    // === UpsertClienteAsync — Delete ===

    [Fact]
    public async Task UpsertCliente_Delete_DeberiaMarcarInactivoYIncrementarVersion()
    {
        var dto = new SyncClienteDto
        {
            Id = ClienteId,
            Nombre = "x", RFC = "x", Correo = "x", Telefono = "0", Direccion = "",
            Version = 1,
            Operation = SyncOperation.Delete,
        };

        var (entity, conflict) = await _sut.UpsertClienteAsync(TenantId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        conflict.Should().BeFalse();
        entity.Activo.Should().BeFalse();
        // Version bump is owned by HandySalesDbContext.SaveChangesAsync interceptor (1→2 on Modified).
        entity.Version.Should().Be(2);
    }

    [Fact]
    public async Task UpsertCliente_DeleteNoExistente_DeberiaLanzarInvalidOperation()
    {
        var dto = new SyncClienteDto
        {
            Id = 99999,
            Nombre = "x", RFC = "x", Correo = "x", Telefono = "0", Direccion = "",
            Operation = SyncOperation.Delete,
        };

        var act = () => _sut.UpsertClienteAsync(TenantId, dto, userId: "10");

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task UpsertCliente_DeleteOtroTenant_DeberiaLanzarUnauthorized()
    {
        _db.Clientes.Add(new Cliente
        {
            Id = 7777, TenantId = OtherTenantId, Nombre = "Otro", RFC = "X", Correo = "x", Telefono = "0",
            Direccion = "", Activo = true, Version = 1,
        });
        await _db.SaveChangesAsync();

        var dto = new SyncClienteDto
        {
            Id = 7777,
            Nombre = "x", RFC = "x", Correo = "x", Telefono = "0", Direccion = "",
            Operation = SyncOperation.Delete,
        };

        var act = () => _sut.UpsertClienteAsync(TenantId, dto, userId: "10");

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    // === UpsertVisitaAsync ===

    [Fact]
    public async Task UpsertVisita_Create_DeberiaPersistirConValoresCorrectos()
    {
        var dto = new SyncVisitaDto
        {
            Id = 0,
            LocalId = "wdb-vis-1",
            ClienteId = ClienteId,
            FechaProgramada = DateTime.UtcNow,
            Estado = (int)TipoVisita.Rutina,
            Notas = "ok",
            Resultado = "Pendiente",
            Activo = true,
            Operation = SyncOperation.Create,
        };

        var (entity, conflict) = await _sut.UpsertVisitaAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        conflict.Should().BeFalse();
        entity.Id.Should().BeGreaterThan(0);
        entity.UsuarioId.Should().Be(UsuarioId);
        entity.Resultado.Should().Be(ResultadoVisita.Pendiente);
        entity.MobileRecordId.Should().Be("wdb-vis-1");
        entity.Version.Should().Be(1);
    }

    [Fact]
    public async Task UpsertVisita_ResultadoInvalido_DeberiaUsarPendienteComoDefault()
    {
        var dto = new SyncVisitaDto
        {
            Id = 0,
            LocalId = "wdb-vis-2",
            ClienteId = ClienteId,
            Estado = (int)TipoVisita.Rutina,
            Resultado = "GarbageValue", // no parsea
            Activo = true,
            Operation = SyncOperation.Create,
        };

        var (entity, _) = await _sut.UpsertVisitaAsync(TenantId, UsuarioId, dto, userId: "10");

        entity.Resultado.Should().Be(ResultadoVisita.Pendiente);
    }

    // === UpsertCobroAsync ===

    [Fact]
    public async Task UpsertCobro_MontoCero_DeberiaLanzarInvalidOperation()
    {
        var dto = new SyncCobroDto
        {
            Id = 0,
            ClienteId = ClienteId,
            Monto = 0m,
            MetodoPago = (int)MetodoPago.Efectivo,
            Operation = SyncOperation.Create,
        };

        var act = () => _sut.UpsertCobroAsync(TenantId, UsuarioId, dto, userId: "10");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*mayor a cero*");
    }

    [Fact]
    public async Task UpsertCobro_PedidoLocalId_DeberiaResolverPedidoIdReal()
    {
        // Seed a pedido created from mobile previously
        _db.Pedidos.Add(new Pedido
        {
            Id = 8000,
            TenantId = TenantId,
            ClienteId = ClienteId,
            UsuarioId = UsuarioId,
            NumeroPedido = "PED-X",
            MobileRecordId = "wdb-ped-1",
            Total = 500m,
            Activo = true,
            Version = 1,
        });
        await _db.SaveChangesAsync();

        var dto = new SyncCobroDto
        {
            Id = 0,
            LocalId = "wdb-cob-1",
            ClienteId = ClienteId,
            PedidoLocalId = "wdb-ped-1", // resolves to PedidoId=8000
            Monto = 100m,
            MetodoPago = (int)MetodoPago.Efectivo,
            Activo = true,
            Operation = SyncOperation.Create,
        };

        var (entity, _) = await _sut.UpsertCobroAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        entity.PedidoId.Should().Be(8000);
    }

    [Fact]
    public async Task UpsertCobro_MontoMayorQueTotalPedido_DeberiaLanzar()
    {
        _db.Pedidos.Add(new Pedido
        {
            Id = 8001, TenantId = TenantId, ClienteId = ClienteId, UsuarioId = UsuarioId,
            NumeroPedido = "PED-Y", Total = 100m, Activo = true, Version = 1,
        });
        await _db.SaveChangesAsync();

        var dto = new SyncCobroDto
        {
            Id = 0,
            ClienteId = ClienteId,
            PedidoId = 8001,
            Monto = 500m, // mayor que Total=100
            MetodoPago = (int)MetodoPago.Efectivo,
            Operation = SyncOperation.Create,
        };

        var act = () => _sut.UpsertCobroAsync(TenantId, UsuarioId, dto, userId: "10");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*excede el total*");
    }

    // === Anti-doble-venta directa (incidente prod 2026-06-23) ===

    private static SyncPedidoDto BuildVentaDirectaDto(string localId, int cantidad = 1)
    {
        return new SyncPedidoDto
        {
            Id = 0,
            LocalId = localId,
            ClienteId = ClienteId,
            TipoVenta = (int)TipoVenta.VentaDirecta,
            Estado = (int)EstadoPedido.Entregado,
            FechaPedido = DateTime.UtcNow,
            Version = 1,
            Operation = SyncOperation.Create,
            Detalles = new List<SyncDetallePedidoDto>
            {
                new()
                {
                    LocalId = localId + "-d1",
                    ProductoId = ProductoId,
                    Cantidad = cantidad,
                    PrecioUnitario = 100m,
                    Descuento = 0m,
                },
            },
        };
    }

    [Fact]
    public async Task UpsertPedido_ColapsaVentaDirectaDuplicada_MismaHuellaEnVentana()
    {
        // Caso offline: ambas copias llegan por sync push (dto.Id=0) con
        // mobile_record_id distinto. El guard de huella debe colapsar la 2a.
        var (a, _) = await _sut.UpsertPedidoAsync(TenantId, UsuarioId, BuildVentaDirectaDto("vd-1"), userId: "10");
        await _sut.SaveChangesAsync();
        var (b, _) = await _sut.UpsertPedidoAsync(TenantId, UsuarioId, BuildVentaDirectaDto("vd-2"), userId: "10");
        await _sut.SaveChangesAsync();

        b.Id.Should().Be(a.Id, "la 2a venta directa idéntica dentro de la ventana se colapsa a la 1a");

        var count = await _db.Pedidos.AsNoTracking()
            .CountAsync(p => p.TenantId == TenantId && p.TipoVenta == TipoVenta.VentaDirecta);
        count.Should().Be(1, "solo debe quedar UN pedido de venta directa");
    }

    [Fact]
    public async Task UpsertPedido_NoColapsa_CuandoTotalDifiere()
    {
        var (a, _) = await _sut.UpsertPedidoAsync(TenantId, UsuarioId, BuildVentaDirectaDto("vd-a", cantidad: 1), userId: "10");
        await _sut.SaveChangesAsync();
        var (b, _) = await _sut.UpsertPedidoAsync(TenantId, UsuarioId, BuildVentaDirectaDto("vd-b", cantidad: 3), userId: "10");
        await _sut.SaveChangesAsync();

        b.Id.Should().NotBe(a.Id, "totales distintos = ventas distintas, no se colapsan");

        var count = await _db.Pedidos.AsNoTracking()
            .CountAsync(p => p.TenantId == TenantId && p.TipoVenta == TipoVenta.VentaDirecta);
        count.Should().Be(2);
    }

    [Fact]
    public async Task UpsertCobro_ColapsaSegundoCobroDeVentaDirecta_MismoPedido()
    {
        // Si una venta directa duplicada se colapsó a un solo pedido, el cobro de
        // la copia llega con otro mobile_record_id pero apunta al MISMO pedido.
        // No se debe crear un segundo cobro activo (doble pago / doble saldo).
        _db.Pedidos.Add(new Pedido
        {
            Id = 8200, TenantId = TenantId, ClienteId = ClienteId, UsuarioId = UsuarioId,
            NumeroPedido = "VD-DUP", TipoVenta = TipoVenta.VentaDirecta, Estado = EstadoPedido.Entregado,
            Total = 100m, Activo = true, Version = 1,
        });
        _db.Cobros.Add(new Cobro
        {
            Id = 9200, TenantId = TenantId, ClienteId = ClienteId, UsuarioId = UsuarioId,
            PedidoId = 8200, MobileRecordId = "cob-orig", Monto = 100m,
            MetodoPago = MetodoPago.Efectivo, Modo = ModoCobro.PorPedido,
            Activo = true, Version = 1,
        });
        await _db.SaveChangesAsync();

        var dto = new SyncCobroDto
        {
            Id = 0, LocalId = "cob-dup", ClienteId = ClienteId, PedidoId = 8200,
            Monto = 100m, MetodoPago = (int)MetodoPago.Efectivo, Activo = true,
            Operation = SyncOperation.Create,
        };

        var (entity, _) = await _sut.UpsertCobroAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        entity.Id.Should().Be(9200, "devuelve el cobro existente en vez de crear otro");
        var count = await _db.Cobros.AsNoTracking().CountAsync(c => c.PedidoId == 8200 && c.Activo);
        count.Should().Be(1, "solo UN cobro activo por venta directa");
    }

    [Fact]
    public async Task UpsertCobro_NoColapsa_CuandoPedidoNoEsVentaDirecta()
    {
        // En preventa un pedido puede tener varios cobros (abonos). El guard NO debe
        // bloquearlos — solo aplica a VentaDirecta.
        _db.Pedidos.Add(new Pedido
        {
            Id = 8201, TenantId = TenantId, ClienteId = ClienteId, UsuarioId = UsuarioId,
            NumeroPedido = "PED-AB", TipoVenta = TipoVenta.Preventa, Estado = EstadoPedido.Confirmado,
            Total = 1000m, Activo = true, Version = 1,
        });
        _db.Cobros.Add(new Cobro
        {
            Id = 9201, TenantId = TenantId, ClienteId = ClienteId, UsuarioId = UsuarioId,
            PedidoId = 8201, MobileRecordId = "abono-1", Monto = 100m,
            MetodoPago = MetodoPago.Efectivo, Modo = ModoCobro.PorPedido,
            Activo = true, Version = 1,
        });
        await _db.SaveChangesAsync();

        var dto = new SyncCobroDto
        {
            Id = 0, LocalId = "abono-2", ClienteId = ClienteId, PedidoId = 8201,
            Monto = 100m, MetodoPago = (int)MetodoPago.Efectivo, Activo = true,
            Operation = SyncOperation.Create,
        };

        var (entity, _) = await _sut.UpsertCobroAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        entity.Id.Should().NotBe(9201, "los abonos de preventa no se colapsan");
        var count = await _db.Cobros.AsNoTracking().CountAsync(c => c.PedidoId == 8201 && c.Activo);
        count.Should().Be(2);
    }

    // === GetStockMapAsync ===

    [Fact]
    public async Task GetStockMap_DeberiaRetornarMapDeProductoIdAStock()
    {
        _db.Inventarios.Add(new Inventario
        {
            Id = 50, TenantId = TenantId, ProductoId = ProductoId,
            CantidadActual = 25m, StockMinimo = 5m, Activo = true,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetStockMapAsync(TenantId);

        result.Should().ContainKey(ProductoId);
        result[ProductoId].cantidad.Should().Be(25m);
        result[ProductoId].minimo.Should().Be(5m);
    }

    // === GetRutasCargaForRutasAsync ===

    [Fact]
    public async Task GetRutasCargaForRutas_ListaVacia_DeberiaRetornarDicVacio()
    {
        var result = await _sut.GetRutasCargaForRutasAsync(TenantId, new List<int>());

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetRutasCargaForRutas_ConIds_DeberiaAgruparPorRutaId()
    {
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 600, TenantId = TenantId, RutaId = 100, ProductoId = ProductoId,
            CantidadEntrega = 10, CantidadVenta = 5, CantidadTotal = 15, PrecioUnitario = 10, Activo = true,
        });
        _db.RutasCarga.Add(new RutaCarga
        {
            Id = 601, TenantId = TenantId, RutaId = 100, ProductoId = ProductoId + 1,
            CantidadEntrega = 2, CantidadVenta = 1, CantidadTotal = 3, PrecioUnitario = 5, Activo = true,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetRutasCargaForRutasAsync(TenantId, new List<int> { 100 });

        result.Should().ContainKey(100);
        result[100].Should().HaveCount(2);
    }

    // === GetDatosEmpresaIfModifiedAsync ===

    [Fact]
    public async Task GetDatosEmpresa_SinSince_DeberiaRetornarEntity()
    {
        _db.DatosEmpresa.Add(new DatosEmpresa
        {
            Id = 1, TenantId = TenantId, RazonSocial = "Test SA", Activo = true,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetDatosEmpresaIfModifiedAsync(TenantId, since: null);

        result.Should().NotBeNull();
        result!.RazonSocial.Should().Be("Test SA");
    }

    [Fact]
    public async Task GetDatosEmpresa_SinceMasNuevoQueModificacion_DeberiaRetornarNull()
    {
        _db.DatosEmpresa.Add(new DatosEmpresa
        {
            Id = 2, TenantId = TenantId, RazonSocial = "Old",
            CreadoEn = DateTime.UtcNow.AddDays(-5),
            ActualizadoEn = DateTime.UtcNow.AddDays(-5),
            Activo = true,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetDatosEmpresaIfModifiedAsync(TenantId, since: DateTime.UtcNow.AddDays(-1));

        result.Should().BeNull();
    }

    // === Paginacion OPCIONAL en Get*ModifiedSinceAsync (Plan 018) ===
    // Estos tests verifican que:
    // (a) sin maxRecords devuelve todo (igual que hoy — backward-compatible)
    // (b) con maxRecords devuelve N y permite detectar hasMore via N+1 truco
    // (c) seguir el cursor con afterId trae el resto sin duplicar ni perder

    [Fact]
    public async Task GetClientesPaginado_SinMaxRecords_DeberiaRetornarTodos()
    {
        // Seed 3 clientes adicionales (1 ya existe = ClienteId)
        _db.Clientes.Add(new Cliente { Id = 1100, TenantId = TenantId, Nombre = "C1", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        _db.Clientes.Add(new Cliente { Id = 1101, TenantId = TenantId, Nombre = "C2", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        _db.Clientes.Add(new Cliente { Id = 1102, TenantId = TenantId, Nombre = "C3", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        await _db.SaveChangesAsync();

        // maxRecords=null → comportamiento identico al pull completo actual
        var result = await _sut.GetClientesModifiedSinceAsync(TenantId, since: null, maxRecords: null, afterId: null);

        result.Should().HaveCount(4); // ClienteId (300) + 3 nuevos
        result.Select(c => c.Id).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task GetClientesPaginado_ConMaxRecords_DeberiaRetornarSolicitado()
    {
        _db.Clientes.Add(new Cliente { Id = 1200, TenantId = TenantId, Nombre = "P1", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        _db.Clientes.Add(new Cliente { Id = 1201, TenantId = TenantId, Nombre = "P2", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        _db.Clientes.Add(new Cliente { Id = 1202, TenantId = TenantId, Nombre = "P3", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        await _db.SaveChangesAsync();

        // Usar maxRecords=2+1=3 (truco N+1 del SyncService para detectar hasMore).
        // Hay 4 registros totales — devuelve 3, permitiendo al servicio detectar hasMore=true.
        var pagina1 = await _sut.GetClientesModifiedSinceAsync(TenantId, since: null, maxRecords: 3, afterId: null);

        pagina1.Should().HaveCount(3);
        // Todos los ids devueltos deben ser menores al maximo (hay uno mas despues)
        pagina1.Select(c => c.Id).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task GetClientesPaginado_ConAfterIdYMaxRecords_DeberiaTraerSiguientePagina()
    {
        // Seed 4 clientes con IDs conocidos
        _db.Clientes.Add(new Cliente { Id = 1300, TenantId = TenantId, Nombre = "R1", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        _db.Clientes.Add(new Cliente { Id = 1301, TenantId = TenantId, Nombre = "R2", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        _db.Clientes.Add(new Cliente { Id = 1302, TenantId = TenantId, Nombre = "R3", RFC = "X", Correo = "x", Telefono = "0", Direccion = "", Activo = true, Version = 1 });
        await _db.SaveChangesAsync();

        // Total: ClienteId(300), 1300, 1301, 1302 — 4 registros

        // Pagina 1: maxRecords=2, sin afterId → trae [300, 1300]
        var pagina1 = await _sut.GetClientesModifiedSinceAsync(TenantId, since: null, maxRecords: 2, afterId: null);
        pagina1.Should().HaveCount(2);
        pagina1[0].Id.Should().Be(ClienteId); // 300
        pagina1[1].Id.Should().Be(1300);

        // Cursor = ultimo id de pagina 1 = 1300
        int cursor1 = pagina1[^1].Id;

        // Pagina 2: afterId=1300 → trae [1301, 1302]
        var pagina2 = await _sut.GetClientesModifiedSinceAsync(TenantId, since: null, maxRecords: 2, afterId: cursor1);
        pagina2.Should().HaveCount(2);
        pagina2[0].Id.Should().Be(1301);
        pagina2[1].Id.Should().Be(1302);

        // Cursor = ultimo id de pagina 2 = 1302
        int cursor2 = pagina2[^1].Id;

        // Pagina 3: afterId=1302 → no hay mas
        var pagina3 = await _sut.GetClientesModifiedSinceAsync(TenantId, since: null, maxRecords: 2, afterId: cursor2);
        pagina3.Should().BeEmpty();

        // Sin duplicados ni perdidos: union de todas las paginas = todos los ids
        var todos = pagina1.Concat(pagina2).Concat(pagina3).Select(c => c.Id).ToList();
        todos.Should().BeEquivalentTo(new[] { ClienteId, 1300, 1301, 1302 });
    }

    [Fact]
    public async Task GetProductosPaginado_SinMaxRecords_DeberiaRetornarTodos()
    {
        // UnidadMedida es requerida por GetProductosModifiedSinceAsync (Include).
        // Cuando UnidadMedidaId es int (non-nullable) y no existe la FK, el Include
        // puede generar INNER JOIN que filtra todo. Se siembra una UdM con id=1.
        _db.Set<UnidadMedida>().Add(new UnidadMedida { Id = 1, TenantId = TenantId, Nombre = "PZA" });
        _db.Productos.Add(new Producto { Id = 2200, TenantId = TenantId, UnidadMedidaId = 1, Nombre = "Q1", CodigoBarra = "Q1", Descripcion = "d", PrecioBase = 10m, Activo = true });
        _db.Productos.Add(new Producto { Id = 2201, TenantId = TenantId, UnidadMedidaId = 1, Nombre = "Q2", CodigoBarra = "Q2", Descripcion = "d", PrecioBase = 10m, Activo = true });
        // El ProductoId(200) del seed también necesita UnidadMedidaId válido para aparecer.
        await _db.Productos
            .Where(p => p.Id == ProductoId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.UnidadMedidaId, 1));
        await _db.SaveChangesAsync();

        var result = await _sut.GetProductosModifiedSinceAsync(TenantId, since: null, maxRecords: null, afterId: null);

        // ProductoId(200) + 2 nuevos = 3
        result.Should().HaveCount(3);
        result.Select(p => p.Id).Should().BeInAscendingOrder();
    }

    [Fact]
    public async Task GetProductosPaginado_ConCursor_NoDuplicaNiPierde()
    {
        _db.Set<UnidadMedida>().Add(new UnidadMedida { Id = 2, TenantId = TenantId, Nombre = "KG" });
        _db.Productos.Add(new Producto { Id = 2300, TenantId = TenantId, UnidadMedidaId = 2, Nombre = "S1", CodigoBarra = "S1", Descripcion = "d", PrecioBase = 10m, Activo = true });
        _db.Productos.Add(new Producto { Id = 2301, TenantId = TenantId, UnidadMedidaId = 2, Nombre = "S2", CodigoBarra = "S2", Descripcion = "d", PrecioBase = 10m, Activo = true });
        // El ProductoId(200) del seed también necesita UnidadMedidaId válido para aparecer.
        await _db.Productos
            .Where(p => p.Id == ProductoId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.UnidadMedidaId, 2));
        await _db.SaveChangesAsync();

        // ProductoId(200) + 2 nuevos = 3 totales
        var pagina1 = await _sut.GetProductosModifiedSinceAsync(TenantId, since: null, maxRecords: 2, afterId: null);
        pagina1.Should().HaveCount(2);
        var cursor = pagina1[^1].Id;

        var pagina2 = await _sut.GetProductosModifiedSinceAsync(TenantId, since: null, maxRecords: 2, afterId: cursor);
        pagina2.Should().HaveCount(1);

        var todos = pagina1.Concat(pagina2).Select(p => p.Id).ToList();
        todos.Should().BeEquivalentTo(new[] { ProductoId, 2300, 2301 });
    }

    // === UpsertRutaDetalleAsync (estado de parada, fix sync jun 2026) ===
    // El repo ya NO guarda internamente (caller hace el save unico) y NO destruye
    // vinculos VisitaId/PedidoId cuando el movil manda null. Retorna (found, entity).

    private const int RutaId = 400;

    private RutaDetalle SeedParada(
        int detalleId,
        EstadoParada estado,
        int? visitaId = null,
        int? pedidoId = null,
        long version = 1,
        int rutaId = RutaId,
        int rutaUsuarioId = UsuarioId)
    {
        if (!_db.RutasVendedor.Any(r => r.Id == rutaId))
        {
            _db.RutasVendedor.Add(new RutaVendedor
            {
                Id = rutaId, TenantId = TenantId, UsuarioId = rutaUsuarioId,
                Codigo = $"RT-{rutaId}", Nombre = "Ruta Test",
                Fecha = DateTime.UtcNow, Estado = EstadoRuta.EnProgreso, Activo = true,
            });
        }
        var detalle = new RutaDetalle
        {
            Id = detalleId, RutaId = rutaId, ClienteId = ClienteId,
            OrdenVisita = 1, Estado = estado, VisitaId = visitaId, PedidoId = pedidoId,
            Version = version, Activo = true,
        };
        _db.RutasDetalle.Add(detalle);
        _db.SaveChanges();
        return detalle;
    }

    [Fact]
    public async Task UpsertRutaDetalle_IdInvalido_DeberiaRetornarNotFound()
    {
        var dto = new SyncRutaDetalleDto { Id = 0, Operation = SyncOperation.Update };

        var (found, entity) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");

        found.Should().BeFalse();
        entity.Should().BeNull();
    }

    [Fact]
    public async Task UpsertRutaDetalle_NoExiste_DeberiaRetornarNotFound()
    {
        var dto = new SyncRutaDetalleDto { Id = 99999, Operation = SyncOperation.Update };

        var (found, entity) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");

        found.Should().BeFalse();
        entity.Should().BeNull();
    }

    [Fact]
    public async Task UpsertRutaDetalle_OtroUsuario_DeberiaRetornarNotFound()
    {
        // Parada de una ruta de OTRO vendedor (usuario 999) — no debe encontrarse.
        SeedParada(510, EstadoParada.Pendiente, rutaId: 410, rutaUsuarioId: 999);
        var dto = new SyncRutaDetalleDto { Id = 510, Operation = SyncOperation.Update };

        var (found, _) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");

        found.Should().BeFalse();
    }

    [Fact]
    public async Task UpsertRutaDetalle_ConHoraSalida_DeberiaNormalizarAVisitado()
    {
        // Mobile manda estado=EnCamino(1) pero con HoraSalidaReal → backend lo
        // normaliza a Visitado (enums divergentes mobile/backend en el valor 1).
        SeedParada(520, EstadoParada.Pendiente);
        var dto = new SyncRutaDetalleDto
        {
            Id = 520,
            Estado = (int)EstadoParada.EnCamino,
            HoraLlegadaReal = DateTime.UtcNow.AddMinutes(-30),
            HoraSalidaReal = DateTime.UtcNow,
            Operation = SyncOperation.Update,
        };

        var (found, entity) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        found.Should().BeTrue();
        entity!.Estado.Should().Be(EstadoParada.Visitado);
        entity.HoraSalidaReal.Should().NotBeNull();
    }

    [Fact]
    public async Task UpsertRutaDetalle_Omitido_DeberiaConservarRazonOmision()
    {
        SeedParada(530, EstadoParada.Pendiente);
        var dto = new SyncRutaDetalleDto
        {
            Id = 530,
            Estado = (int)EstadoParada.Omitido,
            RazonOmision = "Cliente cerrado",
            Operation = SyncOperation.Update,
        };

        var (found, entity) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        found.Should().BeTrue();
        entity!.Estado.Should().Be(EstadoParada.Omitido);
        entity.RazonOmision.Should().Be("Cliente cerrado");
    }

    [Fact]
    public async Task UpsertRutaDetalle_RazonOmisionNull_NoDeberiaBorrarRazonExistente()
    {
        // Transicion Omitido(con razon) -> otro estado: el movil manda razonOmision=null
        // (solo la envia en estado Omitido). El backend NO debe borrar la razon auditable.
        var seed = SeedParada(535, EstadoParada.Omitido);
        seed.RazonOmision = "Cliente cerrado";
        await _db.SaveChangesAsync();

        var dto = new SyncRutaDetalleDto
        {
            Id = 535,
            Estado = (int)EstadoParada.Visitado,
            HoraSalidaReal = DateTime.UtcNow,
            RazonOmision = null,
            Operation = SyncOperation.Update,
        };

        var (found, entity) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        found.Should().BeTrue();
        entity!.RazonOmision.Should().Be("Cliente cerrado"); // conservada, no borrada
    }

    [Fact]
    public async Task UpsertRutaDetalle_VisitaIdNull_NoDeberiaBorrarVinculoExistente()
    {
        // Bug: el movil nunca setea VisitaId (manda null) → el backend NO debe
        // sobreescribir el vinculo que ya existe en el servidor.
        SeedParada(540, EstadoParada.EnCamino, visitaId: 77);
        var dto = new SyncRutaDetalleDto
        {
            Id = 540,
            Estado = (int)EstadoParada.Visitado,
            HoraSalidaReal = DateTime.UtcNow,
            VisitaId = null,
            Operation = SyncOperation.Update,
        };

        var (found, entity) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        found.Should().BeTrue();
        entity!.VisitaId.Should().Be(77); // conservado, no borrado
    }

    [Fact]
    public async Task UpsertRutaDetalle_PedidoIdNull_NoDeberiaBorrarVinculoExistente()
    {
        // El pedido_id local del WDB no mapea a un Id de servidor (llega null) →
        // conservar el PedidoId que el servidor ya tiene.
        SeedParada(550, EstadoParada.EnCamino, pedidoId: 88);
        var dto = new SyncRutaDetalleDto
        {
            Id = 550,
            Estado = (int)EstadoParada.Visitado,
            HoraSalidaReal = DateTime.UtcNow,
            PedidoId = null,
            Operation = SyncOperation.Update,
        };

        var (found, entity) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        found.Should().BeTrue();
        entity!.PedidoId.Should().Be(88); // conservado, no borrado
    }

    [Fact]
    public async Task UpsertRutaDetalle_UpdateConSave_DeberiaIncrementarVersionUnaVez()
    {
        // El repo ya no guarda ni bumpea Version manualmente. Un save logico del
        // caller → el interceptor de HandySalesDbContext incrementa Version 1→2
        // (una sola vez, sin doble-bump).
        SeedParada(560, EstadoParada.Pendiente, version: 1);
        var dto = new SyncRutaDetalleDto
        {
            Id = 560,
            Estado = (int)EstadoParada.Visitado,
            HoraSalidaReal = DateTime.UtcNow,
            Operation = SyncOperation.Update,
        };

        var (found, entity) = await _sut.UpsertRutaDetalleAsync(TenantId, UsuarioId, dto, userId: "10");
        await _sut.SaveChangesAsync();

        found.Should().BeTrue();
        entity!.Version.Should().Be(2);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
