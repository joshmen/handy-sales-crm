namespace HandySuites.Application.Telemetry.DTOs;

/// <summary>
/// B.2 — Payload del heartbeat que envía el cliente mobile cada 5 min cuando
/// hay red y la app está foreground.
///
/// El server agrega timestamp (ReceivedAt), tenant_id + user_id (del JWT) y
/// IP — el cliente nunca puede falsificar esos.
/// </summary>
public class HeartbeatDto
{
    /// <summary>Device id (X-Device-Id header). Si null, el server lo lee del header.</summary>
    public string? DeviceId { get; set; }

    /// <summary>
    /// Mapa por tabla de WDB mobile_record_ids con _status pending. Ej:
    /// {"pedidos": ["wdb-abc", "wdb-def"], "cobros": ["wdb-xyz"]}.
    /// Si null/empty se interpreta como "sin pendings".
    /// </summary>
    public Dictionary<string, List<string>>? PendingByTable { get; set; }

    /// <summary>Timestamp client-side del último sync push OK. Null si nunca sincronizó.</summary>
    public DateTime? LastSyncAt { get; set; }

    public string? AppVersion { get; set; }
    public int? SchemaVersion { get; set; }
}

/// <summary>
/// Outcome del heartbeat — el server reconoce + opcionalmente da hints al cliente
/// (ej. "hace 10 min que no sincronizas, dispara sync push ya").
/// </summary>
public record HeartbeatAckDto(
    long TelemetryId,
    DateTime ReceivedAt,
    bool ShouldForceSyncPush,
    string? Message
);

/// <summary>
/// B.2 — Dashboard admin /sync-health. Lista UN vendedor con backlog para que
/// el supervisor decida si llamar/intervenir antes de pérdida de datos.
/// </summary>
public record SyncHealthAlertDto(
    int UsuarioId,
    string UsuarioNombre,
    string? DeviceId,
    int TotalPendingCount,
    DateTime LastHeartbeatAt,
    DateTime? LastSyncAt,
    string? AppVersion,
    int? SchemaVersion,
    Dictionary<string, int> PendingByTableSummary
);

/// <summary>
/// Wrapper de respuesta del endpoint admin con metadata del query.
/// </summary>
public record SyncHealthResponseDto(
    List<SyncHealthAlertDto> Alerts,
    DateTime GeneratedAt,
    int MinPendingThreshold,
    int MinStaleMinutes
);
