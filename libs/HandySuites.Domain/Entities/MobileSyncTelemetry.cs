using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

/// <summary>
/// B.2 telemetría heartbeat (fix prod 2026-06-03 post-incidente Rodrigo).
///
/// Cada heartbeat del cliente mobile registra UN row con el estado actual de
/// sincronización del device. El supervisor consulta /api/admin/sync-health
/// para detectar vendedores con backlog (pending > N records desde hace > T min)
/// → intervención proactiva antes de que se pierda data (caso Rodrigo).
///
/// NO inherits AuditableEntity porque:
/// - Es high-volume: ~50 vendedores × 12 heartbeats/hr × 24h ≈ 14.4k/día
/// - Es transient: cleanup mensual via cron (no soft-delete history)
/// - Es append-only: nunca se modifica una row existente
///
/// Permitido por CLAUDE.md: "if physical delete needed, entity should NOT
/// inherit AuditableEntity".
/// </summary>
[Table("MobileSyncTelemetry")]
public class MobileSyncTelemetry
{
    [Column("id")]
    public long Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    /// <summary>
    /// Device identifier del cliente (X-Device-Id header). Nullable porque
    /// versions viejas del cliente podrían no enviarlo.
    /// </summary>
    [Column("device_id")]
    public string? DeviceId { get; set; }

    /// <summary>
    /// Timestamp server-side de cuándo se recibió el heartbeat. SIEMPRE
    /// asignado server-side (no confiar en client clock). Indexado para
    /// queries del admin dashboard + cleanup job.
    /// </summary>
    [Column("received_at")]
    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Mapa por tabla de mobile_record_ids con _status='created'/'updated' en
    /// el WDB local. Ej: {"pedidos": ["wdb-abc", "wdb-def"], "cobros": []}.
    /// Almacenado como jsonb para PostgreSQL — permite queries JSON path
    /// (ej. cuántos pedidos pendientes por tenant).
    /// </summary>
    [Column("pending_by_table", TypeName = "jsonb")]
    public string PendingByTableJson { get; set; } = "{}";

    /// <summary>
    /// Total agregado de records pendientes en TODAS las tablas. Pre-computado
    /// para el query del admin dashboard "vendedores con > N pending" sin
    /// requerir parsear el jsonb en cada row.
    /// </summary>
    [Column("total_pending_count")]
    public int TotalPendingCount { get; set; }

    /// <summary>
    /// Timestamp client-side del último sync push exitoso. Si está atrasado
    /// respecto a ReceivedAt + el TotalPendingCount es alto, hay un problema
    /// de sync (caso Rodrigo).
    /// </summary>
    [Column("last_sync_at")]
    public DateTime? LastSyncAt { get; set; }

    [Column("app_version")]
    public string? AppVersion { get; set; }

    [Column("schema_version")]
    public int? SchemaVersion { get; set; }

    /// <summary>
    /// IP del request, capturada server-side desde HttpContext para auditoría.
    /// Nullable porque detrás de proxy podría no estar disponible.
    /// </summary>
    [Column("ip_address")]
    public string? IpAddress { get; set; }
}
