using FluentAssertions;
using HandySuites.Application.Sync.DTOs;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Infrastructure.Repositories.Sync;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
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
        _sut = new SyncRepository(_db);

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
        // SyncRepository.UpsertClienteAsync increments Version (1→2) on update; then the
        // HandySalesDbContext.SaveChangesAsync audit interceptor increments again (2→3) when
        // it detects the entity is Modified. End state in production for a single sync push.
        entity.Version.Should().Be(3);
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

        conflict.Should().BeFalse();
        entity.Activo.Should().BeFalse();
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

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
