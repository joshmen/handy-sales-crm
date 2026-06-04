using FluentAssertions;
using HandySuites.Application.Telemetry.DTOs;
using HandySuites.Application.Telemetry.Interfaces;
using HandySuites.Application.Telemetry.Services;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HandySuites.Tests.Application.Telemetry;

/// <summary>
/// Tests para B.2 SyncTelemetryService (fix prod 2026-06-03 post-incidente
/// Rodrigo). Cubren:
/// - Persistencia correcta del heartbeat (tenant + userId del JWT, no del payload)
/// - Cálculo correcto de TotalPendingCount (sum de listas)
/// - Hint ShouldForceSyncPush cuando hay pendings + lastSync viejo
/// - Hint NO se dispara cuando lastSync es reciente o pendings=0
/// - Endpoint sync-health filtra por threshold + stale + role
///
/// El repo es mockeado (in-memory) — no probamos EF Core aquí, ese es testeo
/// del repo por separado (futuro).
/// </summary>
public class SyncTelemetryServiceTests
{
    private readonly Mock<ISyncTelemetryRepository> _repo;
    private readonly Mock<ICurrentTenant> _tenant;
    private readonly SyncTelemetryService _sut;
    private readonly List<MobileSyncTelemetry> _persisted = new();

    private const int TenantId = 1;
    private const int UsuarioId = 42;

    public SyncTelemetryServiceTests()
    {
        _repo = new Mock<ISyncTelemetryRepository>();
        _tenant = new Mock<ICurrentTenant>();
        _tenant.Setup(t => t.TenantId).Returns(TenantId);
        _tenant.Setup(t => t.UserId).Returns(UsuarioId.ToString());
        _tenant.Setup(t => t.IsSuperAdmin).Returns(false);

        // Repo simula auto-increment id assignment.
        _repo.Setup(r => r.AddHeartbeatAsync(It.IsAny<MobileSyncTelemetry>()))
            .ReturnsAsync((MobileSyncTelemetry e) =>
            {
                e.Id = _persisted.Count + 1;
                _persisted.Add(e);
                return e.Id;
            });

        _sut = new SyncTelemetryService(_repo.Object, _tenant.Object, NullLogger<SyncTelemetryService>.Instance);
    }

    [Fact]
    public async Task SaveHeartbeat_PersistsTenantAndUserFromJwt_NotFromPayload()
    {
        // El cliente no manda tenantId/userId — esos vienen del JWT vía ICurrentTenant.
        // Garantiza que un cliente comprometido NO pueda spoofear el origen del heartbeat.
        var dto = new HeartbeatDto
        {
            DeviceId = "device-xyz",
            PendingByTable = new Dictionary<string, List<string>>
            {
                ["pedidos"] = new() { "wdb-1", "wdb-2", "wdb-3" }
            }
        };

        await _sut.SaveHeartbeatAsync(dto, "192.168.0.1");

        _persisted.Should().HaveCount(1);
        var saved = _persisted[0];
        saved.TenantId.Should().Be(TenantId);
        saved.UsuarioId.Should().Be(UsuarioId);
        saved.DeviceId.Should().Be("device-xyz");
        saved.TotalPendingCount.Should().Be(3, "suma de las listas en pendingByTable");
        saved.IpAddress.Should().Be("192.168.0.1");
        saved.PendingByTableJson.Should().Contain("pedidos").And.Contain("wdb-1");
    }

    [Fact]
    public async Task SaveHeartbeat_ShouldForceSync_WhenPendingsAndLastSyncOld()
    {
        // Caso Rodrigo: 32 pedidos pendientes + último sync hace 2h →
        // server le pide al cliente que sincronice ya.
        var dto = new HeartbeatDto
        {
            PendingByTable = new Dictionary<string, List<string>>
            {
                ["pedidos"] = Enumerable.Range(1, 32).Select(i => $"wdb-{i}").ToList()
            },
            LastSyncAt = DateTime.UtcNow.AddHours(-2),
        };

        var ack = await _sut.SaveHeartbeatAsync(dto, null);

        ack.ShouldForceSyncPush.Should().BeTrue();
        ack.Message.Should().NotBeNullOrEmpty();
        ack.TelemetryId.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task SaveHeartbeat_NoForceSync_WhenLastSyncIsRecent()
    {
        // Cliente que tiene pendings pero sincronizó hace 5 min → no es problema
        // (todavía está dentro del threshold de 30 min).
        var dto = new HeartbeatDto
        {
            PendingByTable = new Dictionary<string, List<string>>
            {
                ["pedidos"] = new() { "wdb-1", "wdb-2" }
            },
            LastSyncAt = DateTime.UtcNow.AddMinutes(-5),
        };

        var ack = await _sut.SaveHeartbeatAsync(dto, null);

        ack.ShouldForceSyncPush.Should().BeFalse();
        ack.Message.Should().BeNull();
    }

    [Fact]
    public async Task SaveHeartbeat_NoForceSync_WhenNoPendings()
    {
        // Cliente sin pendings: aunque su lastSync sea viejo, no hay nada que
        // sincronizar → no force sync.
        var dto = new HeartbeatDto
        {
            PendingByTable = new Dictionary<string, List<string>>
            {
                ["pedidos"] = new(),
                ["cobros"] = new()
            },
            LastSyncAt = DateTime.UtcNow.AddHours(-3),
        };

        var ack = await _sut.SaveHeartbeatAsync(dto, null);

        ack.ShouldForceSyncPush.Should().BeFalse();
    }

    [Fact]
    public async Task SaveHeartbeat_HandlesNullPendingByTable_AsZeroPendings()
    {
        // Cliente viejo o caso edge: payload sin pendingByTable. No debe romper,
        // debe persistir "{}" y TotalPendingCount=0.
        var dto = new HeartbeatDto
        {
            DeviceId = "old-client",
            PendingByTable = null,
        };

        await _sut.SaveHeartbeatAsync(dto, null);

        _persisted.Should().HaveCount(1);
        _persisted[0].TotalPendingCount.Should().Be(0);
        _persisted[0].PendingByTableJson.Should().Be("{}");
    }

    [Fact]
    public async Task SaveHeartbeat_ThrowsInvalidOperation_WhenJwtUserIdIsCorrupt()
    {
        // ICurrentTenant.UserId debería siempre parsearse a int. Si no, JWT está
        // corrupto y debemos fallar fuerte (no persistir basura).
        _tenant.Setup(t => t.UserId).Returns("not-a-number");

        var dto = new HeartbeatDto();

        var act = async () => await _sut.SaveHeartbeatAsync(dto, null);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*UserId*");
    }

    [Fact]
    public async Task GetSyncHealth_ReturnsAlerts_WithSummaryFromJsonb()
    {
        // El repo devuelve rows con pendingByTableJson serializado — el service
        // debe parsearlo a la summary {table: count} para el dashboard.
        var telemetry = new MobileSyncTelemetry
        {
            Id = 100,
            TenantId = TenantId,
            UsuarioId = UsuarioId,
            DeviceId = "device-rodrigo",
            ReceivedAt = DateTime.UtcNow.AddMinutes(-45),
            TotalPendingCount = 35,
            LastSyncAt = DateTime.UtcNow.AddHours(-2),
            PendingByTableJson = """{"pedidos":["w1","w2","w3"],"cobros":["w4","w5"]}""",
            AppVersion = "1.0.9",
            SchemaVersion = 22,
        };
        _repo.Setup(r => r.GetBackloggedUsersAsync(
                It.IsAny<int>(),
                It.IsAny<DateTime>(),
                It.IsAny<bool>()))
            .ReturnsAsync(new List<(MobileSyncTelemetry, string)> { (telemetry, "Rodrigo Pérez") });

        var result = await _sut.GetSyncHealthAsync(minPendingThreshold: 10, minStaleMinutes: 30, allTenants: false);

        result.Alerts.Should().HaveCount(1);
        var alert = result.Alerts[0];
        alert.UsuarioNombre.Should().Be("Rodrigo Pérez");
        alert.TotalPendingCount.Should().Be(35);
        alert.PendingByTableSummary.Should().ContainKey("pedidos").WhoseValue.Should().Be(3);
        alert.PendingByTableSummary.Should().ContainKey("cobros").WhoseValue.Should().Be(2);
        result.MinPendingThreshold.Should().Be(10);
        result.MinStaleMinutes.Should().Be(30);
    }

    [Fact]
    public async Task GetSyncHealth_AllTenants_OnlyHonoredForSuperAdmin()
    {
        // Un ADMIN regular pidiendo allTenants=true NO debe bypassear el filtro.
        // El service decide en base a ICurrentTenant.IsSuperAdmin.
        _tenant.Setup(t => t.IsSuperAdmin).Returns(false);
        _repo.Setup(r => r.GetBackloggedUsersAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<bool>()))
            .ReturnsAsync(new List<(MobileSyncTelemetry, string)>());

        await _sut.GetSyncHealthAsync(10, 30, allTenants: true);

        _repo.Verify(r => r.GetBackloggedUsersAsync(
            It.IsAny<int>(),
            It.IsAny<DateTime>(),
            false /* bypassTenantFilter MUST be false even if caller asked for true */),
            Times.Once);
    }

    [Fact]
    public async Task GetSyncHealth_AllTenants_HonoredOnlyWhenSuperAdminAndExplicit()
    {
        _tenant.Setup(t => t.IsSuperAdmin).Returns(true);
        _repo.Setup(r => r.GetBackloggedUsersAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<bool>()))
            .ReturnsAsync(new List<(MobileSyncTelemetry, string)>());

        await _sut.GetSyncHealthAsync(10, 30, allTenants: true);

        _repo.Verify(r => r.GetBackloggedUsersAsync(
            It.IsAny<int>(),
            It.IsAny<DateTime>(),
            true),
            Times.Once);
    }

    [Fact]
    public async Task PurgeOldHeartbeats_DelegatesToRepoWithCutoff()
    {
        var cutoff = DateTime.UtcNow.AddDays(-60);
        _repo.Setup(r => r.PurgeOlderThanAsync(cutoff)).ReturnsAsync(123);

        var deleted = await _sut.PurgeOldHeartbeatsAsync(cutoff);

        deleted.Should().Be(123);
        _repo.Verify(r => r.PurgeOlderThanAsync(cutoff), Times.Once);
    }
}
