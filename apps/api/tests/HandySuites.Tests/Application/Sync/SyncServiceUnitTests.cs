using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.Sync.DTOs;
using HandySuites.Application.Sync.Interfaces;
using HandySuites.Application.Sync.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Sync;

/// <summary>
/// Unit tests for SyncService. Mocks ISyncRepository + ICurrentTenant + ITransactionManager + ISavepointScope.
///
/// 2026-06-07 refactor: SyncService now uses per-entity SAVEPOINTS for partial-failure tolerance.
/// The mock <see cref="ITransactionManager.ExecuteWithSavepointsAsync"/> invokes the lambda inline
/// with a mock <see cref="ISavepointScope"/>. The savepoint scope's <c>TryRunInSavepointAsync</c>
/// runs the action and returns (true, null) on success or (false, ex) on throw — mirroring the
/// real implementation's behavior so we can assert per-entity error capture without a real DB.
/// </summary>
public class SyncServiceUnitTests
{
    private readonly Mock<ISyncRepository> _repo = new();
    private readonly Mock<ICurrentTenant> _tenant = new();
    private readonly Mock<ITransactionManager> _transactions = new();
    private readonly Mock<ISavepointScope> _savepointScope = new();
    private readonly SyncService _service;

    public SyncServiceUnitTests()
    {
        _tenant.SetupGet(t => t.TenantId).Returns(1);
        _tenant.SetupGet(t => t.UserId).Returns("1");
        _tenant.SetupGet(t => t.Role).Returns("ADMIN");
        _tenant.SetupGet(t => t.IsAdminOrAbove).Returns(true);
        _tenant.SetupGet(t => t.IsStrictAdmin).Returns(true);

        // Mock ExecuteWithSavepointsAsync to invoke the lambda inline with our mock scope,
        // so per-entity savepoint behavior is observable through the existing repo mocks.
        _transactions
            .Setup(t => t.ExecuteWithSavepointsAsync(It.IsAny<Func<ISavepointScope, Task>>()))
            .Returns<Func<ISavepointScope, Task>>(f => f(_savepointScope.Object));

        // Mock TryRunInSavepointAsync to invoke the action and capture exceptions per real
        // SavepointScope semantics: return (true, null) on success, (false, ex) on throw.
        _savepointScope
            .Setup(s => s.TryRunInSavepointAsync(It.IsAny<string>(), It.IsAny<Func<Task>>()))
            .Returns<string, Func<Task>>(async (name, action) =>
            {
                try
                {
                    await action();
                    return (true, (Exception?)null);
                }
                catch (Exception ex)
                {
                    return (false, (Exception?)ex);
                }
            });

        // Default: empty pulls so syncAll requests don't blow up.
        SetupEmptyPulls();

        _service = new SyncService(_repo.Object, _tenant.Object, _transactions.Object);
    }

    private void SetupEmptyPulls()
    {
        _repo.Setup(r => r.GetClientesModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Cliente>());
        _repo.Setup(r => r.GetProductosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Producto>());
        _repo.Setup(r => r.GetStockMapAsync(It.IsAny<int>()))
            .ReturnsAsync(new Dictionary<int, (decimal cantidad, decimal minimo)>());
        _repo.Setup(r => r.GetTasasImpuestoModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<TasaImpuesto>());
        _repo.Setup(r => r.GetPedidosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Pedido>());
        _repo.Setup(r => r.GetVisitasModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<ClienteVisita>());
        _repo.Setup(r => r.GetRutasModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<RutaVendedor>());
        _repo.Setup(r => r.GetRutasCargaForRutasAsync(It.IsAny<int>(), It.IsAny<List<int>>()))
            .ReturnsAsync(new Dictionary<int, List<RutaCarga>>());
        _repo.Setup(r => r.GetCobrosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Cobro>());
        _repo.Setup(r => r.GetGastosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Gasto>());
        _repo.Setup(r => r.GetDevolucionesModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<DevolucionPedido>());
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
        _repo.Setup(r => r.GetListasPrecioModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<ListaPrecio>());
        _repo.Setup(r => r.GetUsuariosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<Usuario>());
        _repo.Setup(r => r.GetMetasVendedorModifiedSinceAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync(new List<MetaVendedor>());
        _repo.Setup(r => r.GetDatosEmpresaIfModifiedAsync(It.IsAny<int>(), It.IsAny<DateTime?>()))
            .ReturnsAsync((HandySuites.Domain.Entities.DatosEmpresa?)null);
        _repo.Setup(r => r.SaveChangesAsync()).ReturnsAsync(0);
    }

    // ============================================================
    // 1. Happy path minimo
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaRetornarServerTimestamp_CuandoRequestVacio()
    {
        var request = new SyncRequestDto { LastSyncTimestamp = null, EntityTypes = null, ClientChanges = null };

        var result = await _service.SyncAsync(request);

        result.Should().NotBeNull();
        result.ServerTimestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        result.Errors.Should().BeEmpty();
        result.Summary.ErrorsFound.Should().Be(0);
    }

    // ============================================================
    // 2. Transaccion (con savepoints) invocada cuando hay ClientChanges
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaInvocarTransaccionConSavepoints_CuandoHayClientChanges()
    {
        var clienteDto = new SyncClienteDto { Id = 1, Nombre = "X", Operation = SyncOperation.Update };
        _repo.Setup(r => r.UpsertClienteAsync(1, clienteDto, "1"))
            .ReturnsAsync((new Cliente { Id = 1 }, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { clienteDto } }
        };

        await _service.SyncAsync(request);

        // 2026-06-07: el wrapper transaccional es ExecuteWithSavepointsAsync (per-entity savepoints).
        // Solo se invoca cuando hay ClientChanges — Pull es read-only fuera de transacción.
        _transactions.Verify(t => t.ExecuteWithSavepointsAsync(It.IsAny<Func<ISavepointScope, Task>>()), Times.Once);
    }

    [Fact]
    public async Task SyncAsync_NoInvocaTransaccion_CuandoNoHayClientChanges()
    {
        var request = new SyncRequestDto(); // sin ClientChanges

        await _service.SyncAsync(request);

        _transactions.Verify(t => t.ExecuteWithSavepointsAsync(It.IsAny<Func<ISavepointScope, Task>>()), Times.Never);
    }

    // ============================================================
    // 3. SaveChanges invocado per-entity dentro del savepoint
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaInvocarSaveChanges_PorCadaEntityPusheada()
    {
        var c1 = new SyncClienteDto { Id = 1, Nombre = "A", Operation = SyncOperation.Update };
        var c2 = new SyncClienteDto { Id = 2, Nombre = "B", Operation = SyncOperation.Update };
        _repo.Setup(r => r.UpsertClienteAsync(1, c1, "1")).ReturnsAsync((new Cliente { Id = 1 }, false));
        _repo.Setup(r => r.UpsertClienteAsync(1, c2, "1")).ReturnsAsync((new Cliente { Id = 2 }, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { c1, c2 } }
        };

        await _service.SyncAsync(request);

        // 2026-06-07: con savepoints per-entity, SaveChangesAsync se llama UNA vez por entity dentro
        // del savepoint (commit aislado por iteración) en lugar de UNA al final del batch.
        _repo.Verify(r => r.SaveChangesAsync(), Times.Exactly(2));
    }

    // ============================================================
    // 4. Captura error y lo reporta cuando la transaccion externa falla (commit failure)
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaCapturarErrorYReportarlo_CuandoExecuteWithSavepointsFalla()
    {
        // Simular fallo en el commit del wrapper (no en una entity individual)
        _transactions
            .Setup(t => t.ExecuteWithSavepointsAsync(It.IsAny<Func<ISavepointScope, Task>>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var request = new SyncRequestDto
        {
            ClientChanges = new SyncChangesDto
            {
                Clientes = new List<SyncClienteDto> { new SyncClienteDto { Id = 1, Nombre = "X" } }
            }
        };

        var result = await _service.SyncAsync(request);

        result.Errors.Should().HaveCount(1);
        result.Errors[0].EntityType.Should().Be("sync");
        result.Errors[0].Operation.Should().Be("push_transaction");
        result.Errors[0].Details.Should().Be("boom");
        result.Summary.ErrorsFound.Should().Be(1);
    }

    // ============================================================
    // 5. Push Clientes incrementa contador cuando no hay conflicto
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPushClientes_YIncrementarPushedCounter_CuandoNoHayConflicto()
    {
        var clienteDto = new SyncClienteDto { Id = 10, Nombre = "Cli", Operation = SyncOperation.Update };
        var entity = new Cliente { Id = 10, Nombre = "Cli" };
        _repo.Setup(r => r.UpsertClienteAsync(1, clienteDto, "1"))
            .ReturnsAsync((entity, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" }, // skip pulls
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { clienteDto } }
        };

        var result = await _service.SyncAsync(request);

        result.Summary.ClientesPushed.Should().Be(1);
        result.Conflicts.Should().BeEmpty();
        result.Errors.Should().BeEmpty();
    }

    // ============================================================
    // 6. Conflicto cliente
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaAgregarConflict_CuandoUpsertClienteRetornaConflict()
    {
        var clienteDto = new SyncClienteDto { Id = 5, Nombre = "Conflict", ActualizadoEn = DateTime.UtcNow };
        var entity = new Cliente { Id = 5, Nombre = "Server", ActualizadoEn = DateTime.UtcNow.AddMinutes(-5), CreadoEn = DateTime.UtcNow.AddDays(-1) };
        _repo.Setup(r => r.UpsertClienteAsync(1, clienteDto, "1"))
            .ReturnsAsync((entity, true));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { clienteDto } }
        };

        var result = await _service.SyncAsync(request);

        result.Conflicts.Should().HaveCount(1);
        result.Conflicts[0].EntityType.Should().Be("Cliente");
        result.Conflicts[0].EntityId.Should().Be(5);
        result.Conflicts[0].Resolution.Should().Be("server_wins");
        result.Summary.ConflictsFound.Should().Be(1);
        result.Summary.ClientesPushed.Should().Be(0);
    }

    // ============================================================
    // 7. CreatedIdMappings cuando cliente nuevo con LocalId
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaCrearIdMapping_CuandoClienteNuevoConLocalId()
    {
        var clienteDto = new SyncClienteDto { Id = 0, LocalId = "abc", Nombre = "Nuevo" };
        var entity = new Cliente { Id = 42, Nombre = "Nuevo" };
        _repo.Setup(r => r.UpsertClienteAsync(1, clienteDto, "1"))
            .ReturnsAsync((entity, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { clienteDto } }
        };

        var result = await _service.SyncAsync(request);

        result.CreatedIdMappings.Should().HaveCount(1);
        result.CreatedIdMappings[0].EntityType.Should().Be("clientes");
        result.CreatedIdMappings[0].LocalId.Should().Be("abc");
        result.CreatedIdMappings[0].ServerId.Should().Be(42);
    }

    // ============================================================
    // 8. Error cuando UpsertCliente lanza excepcion
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaAgregarError_CuandoUpsertClienteLanzaExcepcion()
    {
        var clienteDto = new SyncClienteDto { Id = 7, Nombre = "Err", Operation = SyncOperation.Update };
        _repo.Setup(r => r.UpsertClienteAsync(1, clienteDto, "1"))
            .ThrowsAsync(new InvalidOperationException("upsert failed"));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Clientes = new List<SyncClienteDto> { clienteDto } }
        };

        var result = await _service.SyncAsync(request);

        result.Errors.Should().HaveCount(1);
        result.Errors[0].EntityType.Should().Be("Cliente");
        result.Errors[0].EntityId.Should().Be(7);
        result.Errors[0].Message.Should().Be("upsert failed");
        result.Summary.ErrorsFound.Should().Be(1);
    }

    // ============================================================
    // 9. Push Pedido crea id mapping cuando Operation=Create con LocalId
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPushPedidos_YCrearIdMappingConOperationCreate()
    {
        // Pedido enviado como Update (sendCreatedAsUpdated=true) pero Id==0 → detectar como nuevo
        var pedidoDto = new SyncPedidoDto { Id = 0, LocalId = "ped-local-1", Operation = SyncOperation.Update };
        var entity = new Pedido { Id = 99 };
        _repo.Setup(r => r.UpsertPedidoAsync(1, 1, pedidoDto, "1"))
            .ReturnsAsync((entity, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Pedidos = new List<SyncPedidoDto> { pedidoDto } }
        };

        var result = await _service.SyncAsync(request);

        result.Summary.PedidosPushed.Should().Be(1);
        result.CreatedIdMappings.Should().ContainSingle(m => m.EntityType == "pedidos");
        result.CreatedIdMappings[0].LocalId.Should().Be("ped-local-1");
        result.CreatedIdMappings[0].ServerId.Should().Be(99);
    }

    // ============================================================
    // 10. Conflict path Pedidos
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaAgregarConflictPedido_CuandoUpsertRetornaConflict()
    {
        var pedidoDto = new SyncPedidoDto { Id = 11, ActualizadoEn = DateTime.UtcNow };
        var entity = new Pedido { Id = 11, ActualizadoEn = DateTime.UtcNow.AddMinutes(-1), CreadoEn = DateTime.UtcNow.AddDays(-1) };
        _repo.Setup(r => r.UpsertPedidoAsync(1, 1, pedidoDto, "1"))
            .ReturnsAsync((entity, true));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Pedidos = new List<SyncPedidoDto> { pedidoDto } }
        };

        var result = await _service.SyncAsync(request);

        result.Conflicts.Should().ContainSingle(c => c.EntityType == "Pedido");
        result.Summary.ConflictsFound.Should().Be(1);
        result.Summary.PedidosPushed.Should().Be(0);
    }

    // ============================================================
    // 11. Push Visitas happy path
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPushVisitas_CorrectamenteIncrementandoCounter()
    {
        var visitaDto = new SyncVisitaDto { Id = 3, ClienteId = 10 };
        var entity = new ClienteVisita { Id = 3, ClienteId = 10 };
        _repo.Setup(r => r.UpsertVisitaAsync(1, 1, visitaDto, "1"))
            .ReturnsAsync((entity, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Visitas = new List<SyncVisitaDto> { visitaDto } }
        };

        var result = await _service.SyncAsync(request);

        result.Summary.VisitasPushed.Should().Be(1);
        result.Errors.Should().BeEmpty();
    }

    // ============================================================
    // 12. Rutas filtra Operation=Create (solo Updates)
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaFiltrarRutasSoloUpdate_IgnorandoCreates()
    {
        var rutaCreate = new SyncRutaDto { Id = 1, Nombre = "create", Operation = SyncOperation.Create };
        var rutaUpdate = new SyncRutaDto { Id = 2, Nombre = "update", Operation = SyncOperation.Update };
        _repo.Setup(r => r.UpsertRutaAsync(1, 1, rutaUpdate, "1"))
            .ReturnsAsync((new RutaVendedor { Id = 2 }, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Rutas = new List<SyncRutaDto> { rutaCreate, rutaUpdate } }
        };

        var result = await _service.SyncAsync(request);

        // Create variant nunca debe entrar a UpsertRutaAsync
        _repo.Verify(r => r.UpsertRutaAsync(1, 1, rutaCreate, "1"), Times.Never);
        _repo.Verify(r => r.UpsertRutaAsync(1, 1, rutaUpdate, "1"), Times.Once);
        result.Summary.RutasPushed.Should().Be(1);
    }

    // ============================================================
    // 13. Push Cobros + id mapping
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPushCobros_YCrearIdMappingCuandoNuevo()
    {
        var cobroDto = new SyncCobroDto { Id = 0, LocalId = "cobro-local", Monto = 100 };
        var entity = new Cobro { Id = 77 };
        _repo.Setup(r => r.UpsertCobroAsync(1, 1, cobroDto, "1"))
            .ReturnsAsync((entity, false));

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { Cobros = new List<SyncCobroDto> { cobroDto } }
        };

        var result = await _service.SyncAsync(request);

        result.Summary.CobrosPushed.Should().Be(1);
        result.CreatedIdMappings.Should().ContainSingle(m => m.EntityType == "cobros");
        result.CreatedIdMappings[0].LocalId.Should().Be("cobro-local");
        result.CreatedIdMappings[0].ServerId.Should().Be(77);
    }

    // ============================================================
    // 14. RutaDetalles solo Operation=Update se procesa
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPushRutaDetalles_SoloOperationUpdate()
    {
        var rdCreate = new SyncRutaDetalleDto { Id = 1, ClienteId = 5, Operation = SyncOperation.Create };
        var rdUpdate = new SyncRutaDetalleDto { Id = 2, ClienteId = 6, Operation = SyncOperation.Update };

        _repo.Setup(r => r.UpsertRutaDetalleAsync(1, 1, rdUpdate)).ReturnsAsync(true);

        var request = new SyncRequestDto
        {
            EntityTypes = new List<string> { "noop" },
            ClientChanges = new SyncChangesDto { RutaDetalles = new List<SyncRutaDetalleDto> { rdCreate, rdUpdate } }
        };

        var result = await _service.SyncAsync(request);

        _repo.Verify(r => r.UpsertRutaDetalleAsync(1, 1, rdCreate), Times.Never);
        _repo.Verify(r => r.UpsertRutaDetalleAsync(1, 1, rdUpdate), Times.Once);
        result.Summary.RutaDetallesPushed.Should().Be(1);
    }

    // ============================================================
    // 15. Pull Clientes cuando entityTypes contiene "clientes"
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPullClientes_CuandoEntityTypesContieneClientes()
    {
        _repo.Setup(r => r.GetClientesModifiedSinceAsync(1, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Cliente>
            {
                new Cliente { Id = 1, Nombre = "A", Activo = true },
                new Cliente { Id = 2, Nombre = "B", Activo = true }
            });

        var request = new SyncRequestDto { EntityTypes = new List<string> { "clientes" } };

        var result = await _service.SyncAsync(request);

        _repo.Verify(r => r.GetClientesModifiedSinceAsync(1, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        result.Summary.ClientesPulled.Should().Be(2);
        result.ServerChanges.Clientes.Should().HaveCount(2);
    }

    // ============================================================
    // 16. Pull Productos con tasa denormalizada
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPullProductos_ConTasaDenormalizada()
    {
        var producto = new Producto
        {
            Id = 10,
            Nombre = "Refresco",
            CodigoBarra = "X",
            Descripcion = "d",
            PrecioBase = 20,
            TasaImpuestoId = 5,
            Activo = true
        };
        var tasas = new List<TasaImpuesto>
        {
            new TasaImpuesto { Id = 5, Tasa = 0.08m, Activo = true, EsDefault = false, Nombre = "Frontera" },
            new TasaImpuesto { Id = 6, Tasa = 0.16m, Activo = true, EsDefault = true, Nombre = "Default" }
        };
        _repo.Setup(r => r.GetProductosModifiedSinceAsync(1, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Producto> { producto });
        _repo.Setup(r => r.GetTasasImpuestoModifiedSinceAsync(1, It.IsAny<DateTime?>()))
            .ReturnsAsync(tasas);

        var request = new SyncRequestDto { EntityTypes = new List<string> { "productos" } };

        var result = await _service.SyncAsync(request);

        result.ServerChanges.Productos.Should().HaveCount(1);
        result.ServerChanges.Productos![0].Tasa.Should().Be(0.08m);
        result.Summary.ProductosPulled.Should().Be(1);
    }

    // ============================================================
    // 17. Default tasa cuando producto no tiene TasaImpuestoId
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaUsarDefaultTasa_CuandoProductoNoTieneTasaImpuestoId()
    {
        var producto = new Producto
        {
            Id = 11,
            Nombre = "Galleta",
            CodigoBarra = "Y",
            Descripcion = "d",
            PrecioBase = 5,
            TasaImpuestoId = null,
            Activo = true
        };
        var tasas = new List<TasaImpuesto>
        {
            new TasaImpuesto { Id = 6, Tasa = 0.16m, Activo = true, EsDefault = true, Nombre = "Default" }
        };
        _repo.Setup(r => r.GetProductosModifiedSinceAsync(1, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync(new List<Producto> { producto });
        _repo.Setup(r => r.GetTasasImpuestoModifiedSinceAsync(1, It.IsAny<DateTime?>()))
            .ReturnsAsync(tasas);

        var request = new SyncRequestDto { EntityTypes = new List<string> { "productos" } };

        var result = await _service.SyncAsync(request);

        result.ServerChanges.Productos.Should().HaveCount(1);
        result.ServerChanges.Productos![0].Tasa.Should().Be(0.16m);
    }

    // ============================================================
    // 18. SyncAll → todos los Get* invocados
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPullTodasLasEntidades_CuandoSyncAll()
    {
        var request = new SyncRequestDto { EntityTypes = null }; // syncAll

        await _service.SyncAsync(request);

        _repo.Verify(r => r.GetClientesModifiedSinceAsync(1, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        _repo.Verify(r => r.GetProductosModifiedSinceAsync(1, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        _repo.Verify(r => r.GetPedidosModifiedSinceAsync(1, 1, It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()), Times.Once);
        _repo.Verify(r => r.GetVisitasModifiedSinceAsync(1, 1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetRutasModifiedSinceAsync(1, 1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetCobrosModifiedSinceAsync(1, 1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetGastosModifiedSinceAsync(1, 1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetDevolucionesModifiedSinceAsync(1, 1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetZonasModifiedSinceAsync(1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetCategoriasClienteModifiedSinceAsync(1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetCategoriasProductoModifiedSinceAsync(1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetFamiliasProductoModifiedSinceAsync(1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetListasPrecioModifiedSinceAsync(1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetUsuariosModifiedSinceAsync(1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetMetasVendedorModifiedSinceAsync(1, 1, It.IsAny<DateTime?>()), Times.Once);
        _repo.Verify(r => r.GetDatosEmpresaIfModifiedAsync(1, It.IsAny<DateTime?>()), Times.Once);
    }

    // ============================================================
    // 19. Carga bulk para todas las rutas cuando hay rutas
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaCargarRutasCargaBulk_CuandoHayRutas()
    {
        var rutas = new List<RutaVendedor>
        {
            new RutaVendedor { Id = 100, Nombre = "Ruta A", Activo = true, Fecha = DateTime.UtcNow },
            new RutaVendedor { Id = 101, Nombre = "Ruta B", Activo = true, Fecha = DateTime.UtcNow }
        };
        _repo.Setup(r => r.GetRutasModifiedSinceAsync(1, 1, It.IsAny<DateTime?>()))
            .ReturnsAsync(rutas);
        _repo.Setup(r => r.GetRutasCargaForRutasAsync(1, It.Is<List<int>>(ids => ids.Contains(100) && ids.Contains(101))))
            .ReturnsAsync(new Dictionary<int, List<RutaCarga>>())
            .Verifiable();

        var request = new SyncRequestDto { EntityTypes = new List<string> { "rutas" } };

        var result = await _service.SyncAsync(request);

        _repo.Verify(r => r.GetRutasCargaForRutasAsync(1, It.Is<List<int>>(ids => ids.Count == 2 && ids.Contains(100) && ids.Contains(101))), Times.Once);
        result.Summary.RutasPulled.Should().Be(2);
    }

    // ============================================================
    // 20. Pull DatosEmpresa cuando entityTypes contiene "empresa"
    // ============================================================
    [Fact]
    public async Task SyncAsync_DeberiaPullDatosEmpresa_CuandoEntityTypesContieneEmpresa()
    {
        var empresa = new HandySuites.Domain.Entities.DatosEmpresa
        {
            Id = 1,
            TenantId = 1,
            RazonSocial = "Acme",
            IdentificadorFiscal = "RFC123",
            TipoIdentificadorFiscal = "RFC",
            CreadoEn = DateTime.UtcNow,
            ActualizadoEn = DateTime.UtcNow
        };
        _repo.Setup(r => r.GetDatosEmpresaIfModifiedAsync(1, It.IsAny<DateTime?>()))
            .ReturnsAsync(empresa);

        var request = new SyncRequestDto { EntityTypes = new List<string> { "empresa" } };

        var result = await _service.SyncAsync(request);

        result.ServerChanges.DatosEmpresa.Should().NotBeNull();
        result.ServerChanges.DatosEmpresa!.RazonSocial.Should().Be("Acme");
        result.Summary.DatosEmpresaPulled.Should().BeTrue();
    }

    // ============================================================
    // 21. Paginacion multi-entidad: cursor POR ENTIDAD no pierde ni duplica (Plan 018)
    // ============================================================
    [Fact]
    public async Task SyncAsync_PaginacionMultiEntidad_NoPierdeNiDuplica_ConRangosDeIdDisjuntos()
    {
        // Rangos de Id DISJUNTOS a proposito: clientes [1..5], productos [100,200,300].
        // Este es el escenario que un cursor escalar compartido (Math.Max entre entidades)
        // rompe: tras la 1a pagina el cursor saltaria a 200 (de productos) y se saltaria
        // clientes 3,4,5 (Id <= 200 ya "pasados"). El cursor POR ENTIDAD debe entregar
        // todos los registros de cada entidad sin perder ni duplicar.
        var clientesAll = Enumerable.Range(1, 5)
            .Select(i => new Cliente { Id = i, TenantId = 1, Nombre = $"C{i}", Activo = true }).ToList();
        var productosAll = new[] { 100, 200, 300 }
            .Select(i => new Producto { Id = i, TenantId = 1, Nombre = $"P{i}", CodigoBarra = "X", Descripcion = "d", Activo = true }).ToList();

        // Mock == comportamiento real del repo: filtra Id>afterId, ordena por Id, toma maxRecords.
        _repo.Setup(r => r.GetClientesModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync((int t, DateTime? s, int? max, int? after) =>
                clientesAll.Where(c => c.Id > (after ?? 0)).OrderBy(c => c.Id).Take(max ?? int.MaxValue).ToList());
        _repo.Setup(r => r.GetProductosModifiedSinceAsync(It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<int?>(), It.IsAny<int?>()))
            .ReturnsAsync((int t, DateTime? s, int? max, int? after) =>
                productosAll.Where(p => p.Id > (after ?? 0)).OrderBy(p => p.Id).Take(max ?? int.MaxValue).ToList());

        var clientesVistos = new List<int>();
        var productosVistos = new List<int>();
        var cursors = new Dictionary<string, int>();
        SyncResponseDto res = null!;

        // Caminar las paginas siguiendo el cursor POR ENTIDAD hasta HasMore == false.
        // Bound de 20 rondas: con el bug del cursor compartido el walk terminaria temprano
        // dejando registros sin entregar (la asercion de abajo lo detecta).
        int ronda = 0;
        for (; ronda < 20; ronda++)
        {
            var request = new SyncRequestDto
            {
                EntityTypes = new List<string> { "clientes", "productos" },
                Pagination = new SyncPaginationOptions { MaxRecords = 2, AfterIds = new Dictionary<string, int>(cursors) }
            };

            res = await _service.SyncAsync(request);

            clientesVistos.AddRange(res.ServerChanges.Clientes!.Select(c => c.Id));
            productosVistos.AddRange(res.ServerChanges.Productos!.Select(p => p.Id));

            res.PaginationInfo.Should().NotBeNull("se solicito paginacion (MaxRecords != null)");
            cursors = res.PaginationInfo!.NextCursors;

            if (!res.PaginationInfo.HasMore) break;
        }

        res.PaginationInfo!.HasMore.Should().BeFalse("el walk debe terminar cuando ya no hay mas registros");
        ronda.Should().BeLessThan(19, "no debe iterar indefinidamente");

        // Sin perdida: la union de cada entidad debe ser el set completo.
        // Sin duplicados: cada Id aparece exactamente una vez.
        clientesVistos.Should().BeEquivalentTo(new[] { 1, 2, 3, 4, 5 });
        clientesVistos.Should().OnlyHaveUniqueItems();
        productosVistos.Should().BeEquivalentTo(new[] { 100, 200, 300 });
        productosVistos.Should().OnlyHaveUniqueItems();
    }
}
