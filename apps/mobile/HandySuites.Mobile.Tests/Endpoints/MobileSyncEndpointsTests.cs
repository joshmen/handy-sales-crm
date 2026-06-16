using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Sync.DTOs;
using HandySuites.Application.Sync.Interfaces;
using HandySuites.Application.Sync.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Mobile.Tests.Endpoints;

/// <summary>
/// Tests para SyncService — la capa Application detras de los endpoints
/// /api/mobile/sync, /api/mobile/sync/pull y /api/mobile/sync/push del
/// MobileSyncEndpoints.cs.
///
/// Patron (igual que MobileAuthEndpointsTests / MobilePedidoEagerSaveTests):
///   mock ISyncRepository + Mock&lt;ICurrentTenant&gt; + fake ITransactionManager
///   que ejecuta el lambda inline (porque InMemory provider no soporta
///   transactions de Npgsql retrying strategy).
///
/// Focus principal del rol VENDEDOR:
///   - happy path push (Pedido, Cobro, Cliente offline) genera CreatedIdMappings
///   - happy path pull entrega ServerChanges filtrados por usuarioId
///   - cross-tenant IDOR: ICurrentTenant.TenantId es el unico tenantId pasado
///     al repo. El service NO debe permitir pisarlo desde el dto.
///   - errores de repo individuales no rompen el batch (se acumulan en Errors)
///   - conflictos marcados con Resolution=server_wins
///   - Rutas: solo Update se acepta (rutas las crea admin) — Create silenciado
/// </summary>
public class MobileSyncEndpointsTests
{
    private readonly Mock<ISyncRepository> _repo;
    private readonly Mock<ICurrentTenant> _tenant;
    private readonly FakeTransactionManager _tx;
    private readonly SyncService _service;

    private const int TenantId = 1;
    private const int OtherTenantId = 99;
    private const int VendedorId = 10;

    public MobileSyncEndpointsTests()
    {
        _repo = new Mock<ISyncRepository>();
        _tenant = new Mock<ICurrentTenant>();
        _tenant.Setup(t => t.TenantId).Returns(TenantId);
        _tenant.Setup(t => t.UserId).Returns(VendedorId.ToString());
        _tenant.Setup(t => t.Role).Returns(HandySuites.Domain.Common.RoleNames.Vendedor);

        _tx = new FakeTransactionManager();

        _service = new SyncService(_repo.Object, _tenant.Object, _tx);

        // Default empty repo returns — pull paths devuelven listas vacias.
        SetupEmptyPullDefaults();
    }

    private void SetupEmptyPullDefaults()
    {
        _repo.Setup(r => r.GetClientesModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Cliente>());
        _repo.Setup(r => r.GetProductosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Producto>());
        _repo.Setup(r => r.GetPedidosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Pedido>());
        _repo.Setup(r => r.GetVisitasModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<ClienteVisita>());
        _repo.Setup(r => r.GetRutasModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<RutaVendedor>());
        _repo.Setup(r => r.GetCobrosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Cobro>());
        _repo.Setup(r => r.GetGastosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Gasto>());
        _repo.Setup(r => r.GetDevolucionesModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<DevolucionPedido>());
        _repo.Setup(r => r.GetStockMapAsync(It.IsAny<int>()))
            .ReturnsAsync(new Dictionary<int, (decimal cantidad, decimal minimo)>());
        _repo.Setup(r => r.GetPreciosPorProductoAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<SyncPrecioPorProductoDto>());
        _repo.Setup(r => r.GetDescuentosAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<SyncDescuentoDto>());
        _repo.Setup(r => r.GetPromocionesAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<SyncPromocionDto>());
        _repo.Setup(r => r.GetZonasModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Zona>());
        _repo.Setup(r => r.GetCategoriasClienteModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<CategoriaCliente>());
        _repo.Setup(r => r.GetCategoriasProductoModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<CategoriaProducto>());
        _repo.Setup(r => r.GetFamiliasProductoModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<FamiliaProducto>());
        _repo.Setup(r => r.GetTasasImpuestoModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<TasaImpuesto>());
        _repo.Setup(r => r.GetListasPrecioModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<ListaPrecio>());
        _repo.Setup(r => r.GetUsuariosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Usuario>());
        _repo.Setup(r => r.GetMetasVendedorModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<MetaVendedor>());
        _repo.Setup(r => r.GetDatosEmpresaIfModifiedAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync((DatosEmpresa?)null);
        _repo.Setup(r => r.SaveChangesAsync()).ReturnsAsync(0);
    }

    // ──────────────────────────────────────────────────────────────
    // Happy path — push pedido offline (Vendedor crea pedido offline)
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_PushPedidoOffline_ReturnsCreatedIdMapping_ForLocalId()
    {
        // Arrange — Vendedor crea pedido offline con localId. dto.Id=0 → server crea.
        var pedidoDto = new SyncPedidoDto
        {
            Id = 0,
            LocalId = "mobile-pedido-abc-123",
            ClienteId = 555,
            Operation = SyncOperation.Create,
            Total = 116m,
            Subtotal = 100m,
            Impuestos = 16m
        };

        _repo.Setup(r => r.UpsertPedidoAsync(TenantId, VendedorId, pedidoDto, It.IsAny<string>()))
            .ReturnsAsync((new Pedido { Id = 9001, TenantId = TenantId }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Pedidos = new List<SyncPedidoDto> { pedidoDto } }
        };

        // Act
        var response = await _service.SyncAsync(request);

        // Assert
        response.Errors.Should().BeEmpty();
        response.Conflicts.Should().BeEmpty();
        response.Summary.PedidosPushed.Should().Be(1);
        response.CreatedIdMappings.Should().ContainSingle();
        var mapping = response.CreatedIdMappings.Single();
        mapping.EntityType.Should().Be("pedidos");
        mapping.LocalId.Should().Be("mobile-pedido-abc-123");
        mapping.ServerId.Should().Be(9001);
    }

    [Fact]
    public async Task SyncAsync_PushCobroOffline_ReturnsCreatedIdMapping()
    {
        var cobroDto = new SyncCobroDto
        {
            Id = 0,
            LocalId = "mobile-cobro-xyz",
            ClienteId = 555,
            Monto = 500m,
            Operation = SyncOperation.Create
        };

        _repo.Setup(r => r.UpsertCobroAsync(TenantId, VendedorId, cobroDto, It.IsAny<string>()))
            .ReturnsAsync((new Cobro { Id = 7001, TenantId = TenantId }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Cobros = new List<SyncCobroDto> { cobroDto } }
        };

        var response = await _service.SyncAsync(request);

        response.Summary.CobrosPushed.Should().Be(1);
        response.CreatedIdMappings.Should().ContainSingle(m => m.EntityType == "cobros" && m.ServerId == 7001);
    }

    [Fact]
    public async Task SyncAsync_PushClienteOffline_ReturnsCreatedIdMapping()
    {
        // Vendedor crea cliente offline (cliente nuevo desde la ruta)
        var clienteDto = new SyncClienteDto
        {
            Id = 0,
            LocalId = "mobile-cliente-1",
            Nombre = "Tiendita Don Pepe",
            RFC = "XAXX010101000",
            Operation = SyncOperation.Create
        };

        _repo.Setup(r => r.UpsertClienteAsync(TenantId, clienteDto, It.IsAny<string>()))
            .ReturnsAsync((new Cliente { Id = 4242, TenantId = TenantId }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { clienteDto } }
        };

        var response = await _service.SyncAsync(request);

        response.Summary.ClientesPushed.Should().Be(1);
        response.CreatedIdMappings.Should().ContainSingle(m => m.EntityType == "clientes" && m.ServerId == 4242);
    }

    // ──────────────────────────────────────────────────────────────
    // Tenant isolation — IDOR / multi-tenant
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_AlwaysUsesTenantFromCurrentTenant_NotFromDto()
    {
        // Even if dto came with ClienteId/PedidoId from another tenant, the service
        // MUST always use ICurrentTenant.TenantId (which comes from the JWT) when
        // invoking the repo. Repo is the one enforcing the FK is in-tenant.
        var pedidoDto = new SyncPedidoDto
        {
            Id = 0,
            LocalId = "x",
            ClienteId = 12345,
            Operation = SyncOperation.Create
        };

        _repo.Setup(r => r.UpsertPedidoAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<SyncPedidoDto>(), It.IsAny<string>()))
            .ReturnsAsync((new Pedido { Id = 1 }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Pedidos = new List<SyncPedidoDto> { pedidoDto } }
        };

        await _service.SyncAsync(request);

        // Verifica que SIEMPRE se llamo con el tenantId del JWT, no con uno arbitrario.
        _repo.Verify(r => r.UpsertPedidoAsync(TenantId, VendedorId, pedidoDto, It.IsAny<string>()), Times.Once);
        _repo.Verify(r => r.UpsertPedidoAsync(OtherTenantId, It.IsAny<int>(), It.IsAny<SyncPedidoDto>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task SyncAsync_Pull_FiltersPedidosByVendedorId()
    {
        // Vendedor solo debe ver sus pedidos — el repo recibe usuarioId del JWT.
        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "pedidos" }
        };

        await _service.SyncAsync(request);

        _repo.Verify(r => r.GetPedidosModifiedSinceAsync(TenantId, VendedorId, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        // No debe pedir pedidos de otros usuarios.
        _repo.Verify(r => r.GetPedidosModifiedSinceAsync(It.IsAny<int>(), It.Is<int>(uid => uid != VendedorId), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Never);
    }

    [Fact]
    public async Task SyncAsync_Pull_FiltersVisitasByVendedorId()
    {
        var request = new SyncRequestDto { EntityTypes = new List<string> { "visitas" } };

        await _service.SyncAsync(request);

        _repo.Verify(r => r.GetVisitasModifiedSinceAsync(TenantId, VendedorId, It.IsAny<DateTime?>()), Times.Once);
    }

    [Fact]
    public async Task SyncAsync_Pull_FiltersRutasByVendedorId()
    {
        var request = new SyncRequestDto { EntityTypes = new List<string> { "rutas" } };

        await _service.SyncAsync(request);

        _repo.Verify(r => r.GetRutasModifiedSinceAsync(TenantId, VendedorId, It.IsAny<DateTime?>()), Times.Once);
    }

    [Fact]
    public async Task SyncAsync_Pull_FiltersCobrosByVendedorId()
    {
        var request = new SyncRequestDto { EntityTypes = new List<string> { "cobros" } };

        await _service.SyncAsync(request);

        _repo.Verify(r => r.GetCobrosModifiedSinceAsync(TenantId, VendedorId, It.IsAny<DateTime?>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────
    // Conflict handling — server_wins
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_PushConflict_RecordsServerWinsResolution()
    {
        var pedidoDto = new SyncPedidoDto
        {
            Id = 555,
            LocalId = "p-1",
            ClienteId = 1,
            Operation = SyncOperation.Update,
            ActualizadoEn = DateTime.UtcNow.AddMinutes(-5)
        };

        var serverPedido = new Pedido
        {
            Id = 555,
            TenantId = TenantId,
            ActualizadoEn = DateTime.UtcNow,
            CreadoEn = DateTime.UtcNow.AddDays(-1)
        };

        _repo.Setup(r => r.UpsertPedidoAsync(TenantId, VendedorId, pedidoDto, It.IsAny<string>()))
            .ReturnsAsync((serverPedido, true)); // wasConflict=true

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Pedidos = new List<SyncPedidoDto> { pedidoDto } }
        };

        var response = await _service.SyncAsync(request);

        response.Conflicts.Should().ContainSingle();
        response.Conflicts[0].EntityType.Should().Be("Pedido");
        response.Conflicts[0].EntityId.Should().Be(555);
        response.Conflicts[0].Resolution.Should().Be("server_wins");
        response.Summary.ConflictsFound.Should().Be(1);
        response.Summary.PedidosPushed.Should().Be(0);
    }

    // ──────────────────────────────────────────────────────────────
    // Error handling — per-entity errors don't fail the batch
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_PushSingleEntityThrows_AccumulatesErrorButContinues()
    {
        var dtoFail = new SyncPedidoDto { Id = 0, LocalId = "fail", ClienteId = 1, Operation = SyncOperation.Create };
        var dtoOk = new SyncPedidoDto { Id = 0, LocalId = "ok", ClienteId = 1, Operation = SyncOperation.Create };

        _repo.Setup(r => r.UpsertPedidoAsync(TenantId, VendedorId, dtoFail, It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("FK violation"));
        _repo.Setup(r => r.UpsertPedidoAsync(TenantId, VendedorId, dtoOk, It.IsAny<string>()))
            .ReturnsAsync((new Pedido { Id = 200 }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Pedidos = new List<SyncPedidoDto> { dtoFail, dtoOk } }
        };

        var response = await _service.SyncAsync(request);

        response.Errors.Should().ContainSingle();
        response.Errors[0].EntityType.Should().Be("Pedido");
        response.Errors[0].Message.Should().Contain("FK violation");
        response.Summary.ErrorsFound.Should().Be(1);
        // The second pedido still pushed.
        response.Summary.PedidosPushed.Should().Be(1);
    }

    // ──────────────────────────────────────────────────────────────
    // Rutas — solo Update se acepta (rutas las crea admin, no el vendedor)
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_PushRutaWithCreate_IsSilentlyIgnored_OnlyUpdateRespected()
    {
        // Si un vendedor manda Create de Ruta, el service lo filtra (Where Operation == Update).
        // Esto es por diseño: las rutas las asigna el admin desde web.
        var rutaCreate = new SyncRutaDto { Id = 0, LocalId = "ruta-new", Operation = SyncOperation.Create };
        var rutaUpdate = new SyncRutaDto { Id = 50, LocalId = "ruta-50", Operation = SyncOperation.Update };

        _repo.Setup(r => r.UpsertRutaAsync(TenantId, VendedorId, rutaUpdate, It.IsAny<string>()))
            .ReturnsAsync((new RutaVendedor { Id = 50 }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Rutas = new List<SyncRutaDto> { rutaCreate, rutaUpdate } }
        };

        var response = await _service.SyncAsync(request);

        response.Summary.RutasPushed.Should().Be(1);
        _repo.Verify(r => r.UpsertRutaAsync(TenantId, VendedorId, rutaUpdate, It.IsAny<string>()), Times.Once);
        _repo.Verify(r => r.UpsertRutaAsync(TenantId, VendedorId, rutaCreate, It.IsAny<string>()), Times.Never);
    }

    // ──────────────────────────────────────────────────────────────
    // Server timestamp always set
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_AlwaysReturnsServerTimestamp_EvenOnEmptyRequest()
    {
        var before = DateTime.UtcNow.AddSeconds(-1);

        var response = await _service.SyncAsync(new SyncRequestDto());

        var after = DateTime.UtcNow.AddSeconds(1);
        response.ServerTimestamp.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }

    // ──────────────────────────────────────────────────────────────
    // EntityTypes filter — pull selectivo
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_Pull_OnlyRequestedEntityType_OtherReposNotCalled()
    {
        var request = new SyncRequestDto { EntityTypes = new List<string> { "clientes" } };

        await _service.SyncAsync(request);

        _repo.Verify(r => r.GetClientesModifiedSinceAsync(TenantId, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        _repo.Verify(r => r.GetPedidosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Never);
        _repo.Verify(r => r.GetCobrosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()), Times.Never);
    }

    [Fact]
    public async Task SyncAsync_Pull_EmptyEntityTypes_SyncsAll()
    {
        // Si EntityTypes es vacio → syncAll=true → todos los repos llamados.
        var request = new SyncRequestDto { EntityTypes = new List<string>() };

        await _service.SyncAsync(request);

        _repo.Verify(r => r.GetClientesModifiedSinceAsync(TenantId, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        _repo.Verify(r => r.GetProductosModifiedSinceAsync(TenantId, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        _repo.Verify(r => r.GetPedidosModifiedSinceAsync(TenantId, VendedorId, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        _repo.Verify(r => r.GetVisitasModifiedSinceAsync(TenantId, VendedorId, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetRutasModifiedSinceAsync(TenantId, VendedorId, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetCobrosModifiedSinceAsync(TenantId, VendedorId, It.IsAny<DateTime?>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────
    // LastSyncTimestamp se propaga al repo (delta sync)
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_Pull_PassesLastSyncTimestamp_ToRepo()
    {
        var since = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);
        var request = new SyncRequestDto
        {
            LastSyncTimestamp = since,
            EntityTypes = new List<string> { "pedidos" }
        };

        await _service.SyncAsync(request);

        _repo.Verify(r => r.GetPedidosModifiedSinceAsync(TenantId, VendedorId, since, It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────
    // SaveChangesAsync se invoca cuando todo OK
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_SuccessfulSync_CallsSaveChangesAsync()
    {
        // 2026-06-08: con per-entity savepoints, SaveChangesAsync se llama UNA vez
        // por entity dentro del savepoint (commit aislado), no UNA al final del batch.
        // Pull es read-only y NO llama SaveChangesAsync.
        var cliente = new SyncClienteDto { Id = 1, Nombre = "Test", Operation = SyncOperation.Update };
        _repo.Setup(r => r.UpsertClienteAsync(TenantId, cliente, It.IsAny<string>()))
            .ReturnsAsync((new Cliente { Id = 1 }, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "clientes" },
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { cliente } }
        };

        await _service.SyncAsync(request);

        // Un push entity → un SaveChangesAsync (dentro del savepoint).
        _repo.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task SyncAsync_SaveChangesAsyncThrows_CapturedAsSyncError()
    {
        // Si SaveChangesAsync revienta (ej. constraint violation a nivel DB) dentro
        // del savepoint per-entity, el TryRunInSavepointAsync captura la excepción
        // y reporta el entity en response.Errors[] con detalles del entity. NO se
        // agrega un error generico "sync" al top-level — eso fue revertido del
        // M-1 patch para evitar duplicar diagnosticos.
        var cliente = new SyncClienteDto { Id = 1, Nombre = "Test", Operation = SyncOperation.Update };
        _repo.Setup(r => r.UpsertClienteAsync(TenantId, cliente, It.IsAny<string>()))
            .ReturnsAsync((new Cliente { Id = 1 }, false));
        _repo.Setup(r => r.SaveChangesAsync()).ThrowsAsync(new Exception("DB down"));

        var response = await _service.SyncAsync(new SyncRequestDto
        {
            EntityTypes = new List<string> { "clientes" },
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { cliente } }
        });

        response.Errors.Should().ContainSingle();
        // El error reporta el entity especifico que fallo, no "sync" generico.
        response.Errors[0].EntityType.Should().Be("Cliente");
        response.Errors[0].Message.Should().Contain("DB down");
        response.HasErrors.Should().BeTrue();
    }

    // ──────────────────────────────────────────────────────────────
    // Fake transaction manager — ejecuta lambda inline.
    // No usamos InMemoryDatabase con real transactions porque el provider
    // InMemory NO los soporta (lanza). Esto refleja exactamente el
    // contrato de ITransactionManager.
    // ──────────────────────────────────────────────────────────────
    private sealed class FakeTransactionManager : ITransactionManager
    {
        public Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation) => operation();
        public Task ExecuteInTransactionAsync(Func<Task> operation) => operation();

        // 2026-06-08: nuevos miembros de ITransactionManager (per-entity savepoints).
        // En tests inline ejecutamos la operacion con un FakeSavepointScope que corre
        // cada accion inline y captura excepciones segun la semantica de SavepointScope.
        public Task<T> ExecuteWithSavepointsAsync<T>(Func<ISavepointScope, Task<T>> operation)
            => operation(new FakeSavepointScope());
        public Task ExecuteWithSavepointsAsync(Func<ISavepointScope, Task> operation)
            => operation(new FakeSavepointScope());
    }

    private sealed class FakeSavepointScope : ISavepointScope
    {
        public async Task<(bool Committed, Exception? Error)> TryRunInSavepointAsync(string savepointName, Func<Task> action)
        {
            try { await action(); return (true, null); }
            catch (Exception ex) { return (false, ex); }
        }
    }
}
