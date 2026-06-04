using System.Text.Json;
using HandySuites.Application.Telemetry.DTOs;
using HandySuites.Application.Telemetry.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Shared.Multitenancy;
using Microsoft.Extensions.Logging;

namespace HandySuites.Application.Telemetry.Services;

/// <summary>
/// B.2 telemetría heartbeat (fix prod 2026-06-03 post-incidente Rodrigo).
/// </summary>
public class SyncTelemetryService : ISyncTelemetryService
{
    private readonly ISyncTelemetryRepository _repo;
    private readonly ICurrentTenant _tenant;
    private readonly ILogger<SyncTelemetryService> _logger;

    // Hint al cliente: si su lastSyncAt está >= 30 min atrás Y hay pendings,
    // sugerir force sync. Caso Rodrigo: 2h sin sync con 32 pedidos pendientes →
    // server le pide al cliente que dispare sync immediately + dashboard alerta
    // al supervisor.
    private const int ForceSyncSuggestionThresholdMinutes = 30;

    public SyncTelemetryService(
        ISyncTelemetryRepository repo,
        ICurrentTenant tenant,
        ILogger<SyncTelemetryService> logger)
    {
        _repo = repo;
        _tenant = tenant;
        _logger = logger;
    }

    public async Task<HeartbeatAckDto> SaveHeartbeatAsync(HeartbeatDto dto, string? ipAddress)
    {
        var tenantId = _tenant.TenantId;
        if (!int.TryParse(_tenant.UserId, out var userId))
        {
            throw new InvalidOperationException("ICurrentTenant.UserId no es un int parseable — JWT corrupto?");
        }

        // CRITICAL: el cliente NO puede inflar counts — solo suma de lo que
        // mandó en sus listas. Si manda null/empty, se interpreta como
        // "sin pendings" (TotalPendingCount=0).
        var pendingByTable = dto.PendingByTable ?? new Dictionary<string, List<string>>();
        var totalPending = pendingByTable.Values.Sum(list => list?.Count ?? 0);
        var pendingJson = JsonSerializer.Serialize(pendingByTable);

        var entity = new MobileSyncTelemetry
        {
            TenantId = tenantId,
            UsuarioId = userId,
            DeviceId = dto.DeviceId,
            ReceivedAt = DateTime.UtcNow,
            PendingByTableJson = pendingJson,
            TotalPendingCount = totalPending,
            LastSyncAt = dto.LastSyncAt,
            AppVersion = dto.AppVersion,
            SchemaVersion = dto.SchemaVersion,
            IpAddress = ipAddress,
        };

        var id = await _repo.AddHeartbeatAsync(entity);

        var shouldForceSync = totalPending > 0
            && (dto.LastSyncAt == null
                || (DateTime.UtcNow - dto.LastSyncAt.Value).TotalMinutes >= ForceSyncSuggestionThresholdMinutes);

        if (shouldForceSync)
        {
            _logger.LogWarning(
                "Telemetría: vendedor {UsuarioId} (tenant {TenantId}) tiene {Pending} pendings, lastSync {LastSync} — sugiriendo force sync",
                userId, tenantId, totalPending, dto.LastSyncAt);
        }

        return new HeartbeatAckDto(
            TelemetryId: id,
            ReceivedAt: entity.ReceivedAt,
            ShouldForceSyncPush: shouldForceSync,
            Message: shouldForceSync
                ? "Tu última sincronización fue hace más de 30 min con pedidos pendientes. Intenta sincronizar manualmente."
                : null
        );
    }

    public async Task<SyncHealthResponseDto> GetSyncHealthAsync(
        int minPendingThreshold,
        int minStaleMinutes,
        bool allTenants)
    {
        var staleThreshold = DateTime.UtcNow.AddMinutes(-minStaleMinutes);

        // bypassTenantFilter solo si el caller es SuperAdmin Y explícitamente
        // pidió allTenants. Es defensa en profundidad: el endpoint también
        // valida por role, pero el service no se confía.
        var rows = await _repo.GetBackloggedUsersAsync(
            minPendingThreshold,
            staleThreshold,
            bypassTenantFilter: allTenants && _tenant.IsSuperAdmin);

        var alerts = rows.Select(r =>
        {
            // Parsear pendingByTable jsonb → summary {table: count}. Si está
            // corrupto, log + retornar summary vacío (no romper el dashboard).
            var summary = new Dictionary<string, int>();
            try
            {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(r.Telemetry.PendingByTableJson);
                if (parsed != null)
                {
                    foreach (var kvp in parsed)
                    {
                        summary[kvp.Key] = kvp.Value?.Count ?? 0;
                    }
                }
            }
            catch (JsonException)
            {
                _logger.LogWarning("Telemetría row {Id} con pending_by_table jsonb inválido", r.Telemetry.Id);
            }

            return new SyncHealthAlertDto(
                UsuarioId: r.Telemetry.UsuarioId,
                UsuarioNombre: r.UsuarioNombre,
                DeviceId: r.Telemetry.DeviceId,
                TotalPendingCount: r.Telemetry.TotalPendingCount,
                LastHeartbeatAt: r.Telemetry.ReceivedAt,
                LastSyncAt: r.Telemetry.LastSyncAt,
                AppVersion: r.Telemetry.AppVersion,
                SchemaVersion: r.Telemetry.SchemaVersion,
                PendingByTableSummary: summary
            );
        })
        .OrderByDescending(a => a.TotalPendingCount)
        .ToList();

        return new SyncHealthResponseDto(alerts, DateTime.UtcNow, minPendingThreshold, minStaleMinutes);
    }

    public Task<int> PurgeOldHeartbeatsAsync(DateTime cutoffDate)
        => _repo.PurgeOlderThanAsync(cutoffDate);
}
