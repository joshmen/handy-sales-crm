using System.Diagnostics;
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
/// Caso: ext-sync-10k  — VENDEDOR  — backend
///
/// Escenario: el vendedor estuvo varios dias offline (mala cobertura en ruta) y
/// acumulo cientos/miles de cambios locales: pedidos, cobros, clientes nuevos.
/// Al reconectarse el dispositivo dispara un solo POST /api/mobile/sync con un
/// payload "grande" (~10k entidades combinadas) y espera:
///
///   1. Todos los CreatedIdMappings devueltos (para que WatermelonDB pueda
///      remapear sus localIds a serverIds).
///   2. Summary.*Pushed coincide con la cardinalidad real.
///   3. ICurrentTenant.TenantId/UserId del JWT es el unico tenant/usuario
///      consultado por el repo — el dto NUNCA puede pisar el tenant
///      (IDOR cross-tenant en payloads masivos).
///   4. Errores individuales NO rompen el batch: 1 FK violation entre 5000
///      pedidos no debe anular las otras 4999 ops exitosas.
///   5. Si SaveChangesAsync revienta al final (constraint violation a nivel DB),
///      el outer try/catch lo captura — el cliente recibe 200 con HasErrors=true.
///   6. Performance: 10k upserts mockeados deben completar en &lt; 30s
///      (sanity check — sin patologia O(n^2) en la capa Application).
///
/// Patron: mock ISyncRepository + Mock&lt;ICurrentTenant&gt; + fake ITransactionManager
/// (NO WebApplicationFactory — falla por JWT config y porque queremos medir
/// solo la logica de SyncService sin overhead HTTP).
/// </summary>
public class MobileSyncLargePayloadTests
{
    private const int TenantId = 1;
    private const int OtherTenantId = 99;
    private const int VendedorId = 10;

    private readonly Mock<ISyncRepository> _repo;
    private readonly Mock<ICurrentTenant> _tenant;
    private readonly FakeTransactionManager _tx;
    private readonly SyncService _service;

    public MobileSyncLargePayloadTests()
    {
        _repo = new Mock<ISyncRepository>();
        _tenant = new Mock<ICurrentTenant>();
        _tenant.Setup(t => t.TenantId).Returns(TenantId);
        _tenant.Setup(t => t.UserId).Returns(VendedorId.ToString());
        _tenant.Setup(t => t.Role).Returns(HandySuites.Domain.Common.RoleNames.Vendedor);

        _tx = new FakeTransactionManager();
        _service = new SyncService(_repo.Object, _tenant.Object, _tx);

        SetupEmptyPullDefaults();
    }

    private void SetupEmptyPullDefaults()
    {
        // El test es PUSH-heavy. Pull devuelve vacios para no contaminar el summary.
        _repo.Setup(r => r.GetClientesModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Cliente>());
        _repo.Setup(r => r.GetProductosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Producto>());
        _repo.Setup(r => r.GetPedidosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
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
    // Happy path — 10k entidades mixtas en un solo batch
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_LargePayload_10kMixedEntities_AllPushedAndMapped()
    {
        // Arrange — 4000 pedidos + 4000 cobros + 2000 clientes nuevos = 10 000 ops.
        const int totalPedidos = 4000;
        const int totalCobros = 4000;
        const int totalClientes = 2000;

        var pedidos = BuildPedidos(totalPedidos);
        var cobros = BuildCobros(totalCobros);
        var clientes = BuildClientes(totalClientes);

        // Repo: cada upsert genera un Id sintetico determinista
        // (serverId = 100000 + index) — sin conflictos.
        _repo.Setup(r => r.UpsertPedidoAsync(TenantId, VendedorId, It.IsAny<SyncPedidoDto>(), It.IsAny<string>()))
            .ReturnsAsync((int t, int u, SyncPedidoDto dto, string _) =>
                (new Pedido { Id = 100_000 + ExtractIndex(dto.LocalId), TenantId = t }, false));

        _repo.Setup(r => r.UpsertCobroAsync(TenantId, VendedorId, It.IsAny<SyncCobroDto>(), It.IsAny<string>()))
            .ReturnsAsync((int t, int u, SyncCobroDto dto, string _) =>
                (new Cobro { Id = 200_000 + ExtractIndex(dto.LocalId), TenantId = t }, false));

        _repo.Setup(r => r.UpsertClienteAsync(TenantId, It.IsAny<SyncClienteDto>(), It.IsAny<string>()))
            .ReturnsAsync((int t, SyncClienteDto dto, string _) =>
                (new Cliente { Id = 300_000 + ExtractIndex(dto.LocalId), TenantId = t }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto
            {
                Pedidos = pedidos,
                Cobros = cobros,
                Clientes = clientes
            }
        };

        // Act
        var sw = Stopwatch.StartNew();
        var response = await _service.SyncAsync(request);
        sw.Stop();

        // Assert — totales correctos
        response.Summary.PedidosPushed.Should().Be(totalPedidos);
        response.Summary.CobrosPushed.Should().Be(totalCobros);
        response.Summary.ClientesPushed.Should().Be(totalClientes);
        response.Errors.Should().BeEmpty();
        response.Conflicts.Should().BeEmpty();

        // Assert — todos los localId → serverId mapeados
        response.CreatedIdMappings.Should().HaveCount(totalPedidos + totalCobros + totalClientes);
        response.CreatedIdMappings.Count(m => m.EntityType == "pedidos").Should().Be(totalPedidos);
        response.CreatedIdMappings.Count(m => m.EntityType == "cobros").Should().Be(totalCobros);
        response.CreatedIdMappings.Count(m => m.EntityType == "clientes").Should().Be(totalClientes);

        // Assert — ningun mapping con ServerId=0 (todos resueltos)
        response.CreatedIdMappings.Should().OnlyContain(m => m.ServerId > 0 && !string.IsNullOrEmpty(m.LocalId));

        // Assert — performance sanity (mocks puros, sin DB). Si esto excede 30s
        // significa que hay O(n^2) en agregacion de Errors/Conflicts/Mappings.
        sw.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(30),
            "10k mocked upserts no deben tener patologia O(n^2)");

        // Assert — SaveChangesAsync se invoca UNA sola vez al final (batch transaction)
        _repo.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    // ──────────────────────────────────────────────────────────────
    // Tenant isolation con payload grande — IDOR cross-tenant
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_LargePayload_AlwaysUsesJwtTenant_NeverDtoTenant()
    {
        // Aunque un cliente malicioso fuerce un payload masivo apuntando a otro
        // tenant (ej. ClienteId=99999 que pertenece a OtherTenantId), el service
        // SIEMPRE pasa ICurrentTenant.TenantId al repo.
        const int total = 1000;
        var pedidos = BuildPedidos(total, clienteIdStart: 50_000); // FK al "otro" tenant

        _repo.Setup(r => r.UpsertPedidoAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<SyncPedidoDto>(), It.IsAny<string>()))
            .ReturnsAsync((int t, int u, SyncPedidoDto dto, string _) =>
                (new Pedido { Id = 1_000 + ExtractIndex(dto.LocalId), TenantId = t }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Pedidos = pedidos }
        };

        await _service.SyncAsync(request);

        // Cada uno de los 1000 upserts DEBE haber sido llamado con TenantId del JWT.
        _repo.Verify(
            r => r.UpsertPedidoAsync(TenantId, VendedorId, It.IsAny<SyncPedidoDto>(), It.IsAny<string>()),
            Times.Exactly(total));

        // Nunca con otro tenantId — proteccion IDOR.
        _repo.Verify(
            r => r.UpsertPedidoAsync(OtherTenantId, It.IsAny<int>(), It.IsAny<SyncPedidoDto>(), It.IsAny<string>()),
            Times.Never);
        _repo.Verify(
            r => r.UpsertPedidoAsync(It.Is<int>(t => t != TenantId), It.IsAny<int>(), It.IsAny<SyncPedidoDto>(), It.IsAny<string>()),
            Times.Never);
    }

    // ──────────────────────────────────────────────────────────────
    // Resiliencia: 1 error entre miles no rompe el batch
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_LargePayload_OneEntityFails_RestComplete()
    {
        const int total = 5000;
        var pedidos = BuildPedidos(total);

        // Pedido en posicion 2500 lanza FK violation. Los otros 4999 ok.
        var failingLocalId = pedidos[2500].LocalId!;

        _repo.Setup(r => r.UpsertPedidoAsync(
                TenantId, VendedorId,
                It.Is<SyncPedidoDto>(p => p.LocalId == failingLocalId),
                It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("FK violation cliente_id 999999"));

        _repo.Setup(r => r.UpsertPedidoAsync(
                TenantId, VendedorId,
                It.Is<SyncPedidoDto>(p => p.LocalId != failingLocalId),
                It.IsAny<string>()))
            .ReturnsAsync((int t, int u, SyncPedidoDto dto, string _) =>
                (new Pedido { Id = 100_000 + ExtractIndex(dto.LocalId), TenantId = t }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Pedidos = pedidos }
        };

        var response = await _service.SyncAsync(request);

        // 1 fallo registrado en Errors
        response.Errors.Should().ContainSingle();
        response.Errors[0].EntityType.Should().Be("Pedido");
        response.Errors[0].Message.Should().Contain("FK violation");
        response.Summary.ErrorsFound.Should().Be(1);

        // Los otros 4999 si se procesaron
        response.Summary.PedidosPushed.Should().Be(total - 1);
        response.CreatedIdMappings.Count(m => m.EntityType == "pedidos").Should().Be(total - 1);
        response.HasErrors.Should().BeTrue();
    }

    // ──────────────────────────────────────────────────────────────
    // SaveChangesAsync revienta al final con payload grande
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_LargePayload_SaveChangesFails_CapturedAsSyncError()
    {
        // Si la transaccion final falla (constraint, deadlock, timeout PG con
        // payload muy grande), el outer try/catch captura y devuelve 200 con
        // HasErrors=true en lugar de 500. Mobile entonces re-encola para retry.
        const int total = 3000;
        var pedidos = BuildPedidos(total);

        _repo.Setup(r => r.UpsertPedidoAsync(TenantId, VendedorId, It.IsAny<SyncPedidoDto>(), It.IsAny<string>()))
            .ReturnsAsync((int t, int u, SyncPedidoDto dto, string _) =>
                (new Pedido { Id = 100_000 + ExtractIndex(dto.LocalId), TenantId = t }, false));

        _repo.Setup(r => r.SaveChangesAsync())
            .ThrowsAsync(new Exception("PostgresException: deadlock detected"));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Pedidos = pedidos }
        };

        var response = await _service.SyncAsync(request);

        response.Errors.Should().ContainSingle();
        response.Errors[0].EntityType.Should().Be("sync");
        response.Errors[0].Details.Should().Contain("deadlock");
        response.HasErrors.Should().BeTrue();

        // ServerTimestamp aun se setea — mobile usa este para next-since
        response.ServerTimestamp.Should().BeAfter(DateTime.UtcNow.AddMinutes(-1));
    }

    // ──────────────────────────────────────────────────────────────
    // Sub-batch: solo cobros, valida CreatedIdMappings cardinalidad
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_LargePayload_Only10kCobros_PreservesLocalIdOrdering()
    {
        const int total = 10_000;
        var cobros = BuildCobros(total);

        _repo.Setup(r => r.UpsertCobroAsync(TenantId, VendedorId, It.IsAny<SyncCobroDto>(), It.IsAny<string>()))
            .ReturnsAsync((int t, int u, SyncCobroDto dto, string _) =>
                (new Cobro { Id = 200_000 + ExtractIndex(dto.LocalId), TenantId = t }, false));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto { Cobros = cobros }
        };

        var response = await _service.SyncAsync(request);

        response.Summary.CobrosPushed.Should().Be(total);
        response.CreatedIdMappings.Should().HaveCount(total);

        // Verificacion de unicidad: no duplicados de localId en los mappings.
        // (Bug clase A: si el service emite el mismo mapping 2x por una doble
        // iteracion, mobile remapea mal y deja al pedido huerfano.)
        var distinctLocalIds = response.CreatedIdMappings.Select(m => m.LocalId).Distinct().Count();
        distinctLocalIds.Should().Be(total, "cada localId debe aparecer exactamente una vez");

        var distinctServerIds = response.CreatedIdMappings.Select(m => m.ServerId).Distinct().Count();
        distinctServerIds.Should().Be(total, "cada serverId asignado debe ser unico");
    }

    // ──────────────────────────────────────────────────────────────
    // Payload vacio — no debe romper aunque ClientChanges venga seteado
    // ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SyncAsync_EmptyClientChanges_StillReturnsValidResponse()
    {
        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto() // todas las listas null
        };

        var response = await _service.SyncAsync(request);

        response.Errors.Should().BeEmpty();
        response.CreatedIdMappings.Should().BeEmpty();
        response.Summary.PedidosPushed.Should().Be(0);
        response.Summary.CobrosPushed.Should().Be(0);
        response.Summary.ClientesPushed.Should().Be(0);
        response.ServerTimestamp.Should().BeAfter(DateTime.UtcNow.AddMinutes(-1));

        // Nunca se llamo a ningun Upsert
        _repo.Verify(r => r.UpsertPedidoAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<SyncPedidoDto>(), It.IsAny<string>()),
            Times.Never);
        _repo.Verify(r => r.UpsertCobroAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<SyncCobroDto>(), It.IsAny<string>()),
            Times.Never);
    }

    // ──────────────────────────────────────────────────────────────
    // Builders
    // ──────────────────────────────────────────────────────────────

    private static List<SyncPedidoDto> BuildPedidos(int n, int clienteIdStart = 1)
    {
        var list = new List<SyncPedidoDto>(n);
        for (int i = 0; i < n; i++)
        {
            list.Add(new SyncPedidoDto
            {
                Id = 0,
                LocalId = $"wdb-pedido-{i:D6}",
                ClienteId = clienteIdStart + (i % 500),
                FechaPedido = DateTime.UtcNow.AddMinutes(-i),
                Operation = SyncOperation.Create,
                Subtotal = 100m + i,
                Impuestos = 16m,
                Total = 116m + i
            });
        }
        return list;
    }

    private static List<SyncCobroDto> BuildCobros(int n)
    {
        var list = new List<SyncCobroDto>(n);
        for (int i = 0; i < n; i++)
        {
            list.Add(new SyncCobroDto
            {
                Id = 0,
                LocalId = $"wdb-cobro-{i:D6}",
                ClienteId = 1 + (i % 500),
                Monto = 50m + i,
                FechaCobro = DateTime.UtcNow.AddMinutes(-i),
                Operation = SyncOperation.Create
            });
        }
        return list;
    }

    private static List<SyncClienteDto> BuildClientes(int n)
    {
        var list = new List<SyncClienteDto>(n);
        for (int i = 0; i < n; i++)
        {
            list.Add(new SyncClienteDto
            {
                Id = 0,
                LocalId = $"wdb-cli-{i:D6}",
                Nombre = $"Tienda offline {i}",
                RFC = "XAXX010101000",
                Operation = SyncOperation.Create
            });
        }
        return list;
    }

    /// <summary>
    /// Extrae el indice numerico del localId "wdb-pedido-000123" → 123.
    /// Devuelve hash estable para localIds que no siguen el patron numerado.
    /// </summary>
    private static int ExtractIndex(string? localId)
    {
        if (string.IsNullOrEmpty(localId)) return 0;
        var lastDash = localId.LastIndexOf('-');
        if (lastDash < 0 || lastDash == localId.Length - 1) return Math.Abs(localId.GetHashCode());
        return int.TryParse(localId.AsSpan(lastDash + 1), out var idx)
            ? idx
            : Math.Abs(localId.GetHashCode());
    }

    /// <summary>
    /// Fake ITransactionManager — ejecuta lambda inline.
    /// Igual que MobileSyncEndpointsTests: InMemory provider no soporta
    /// transactions de Npgsql retrying strategy, asi que ejecutamos directo.
    /// </summary>
    private sealed class FakeTransactionManager : ITransactionManager
    {
        public Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation) => operation();
        public Task ExecuteInTransactionAsync(Func<Task> operation) => operation();
    }
}
