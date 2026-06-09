using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Notifications;

/// <summary>
/// H-2 Outbox MVP — durable queue for fire-and-forget side-effects (mobile push,
/// SignalR events) that previously ran inside `_ = Task.Run(async () => ...)`
/// blocks. If the process crashed between enqueue and dispatch, the notification
/// was silently lost; with the outbox, OutboxProcessor picks up pending rows on
/// next poll and retries with exponential backoff.
///
/// Append-only + processor-managed lifecycle — does NOT inherit AuditableEntity
/// (no soft delete, no per-row audit columns; the table will be purged by a
/// retention job once rows reach `Sent` or terminal `Failed`).
///
/// Original 4 callsites refactored (2026-06-07):
///   - RutaVendedorEndpoints.NotifyMobileRouteCancelled
///   - RutaVendedorEndpoints.NotifyMobileRouteAssignment
///   - RutaVendedorEndpoints.EmitRouteAssignedSignalR
///   - RutaVendedorEndpoints.NotifyMobileRouteSentToLoad
/// </summary>
[Table("notification_outbox")]
public class NotificationOutbox
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    /// <summary>
    /// Discriminator for `PayloadJson` deserialization in OutboxProcessor.
    /// </summary>
    [Column("notification_type")]
    public NotificationOutboxType NotificationType { get; set; }

    /// <summary>
    /// JSON-serialized payload — shape depends on `NotificationType`.
    /// See <see cref="NotificationOutboxType"/> for the contract per type.
    /// </summary>
    [Column("payload_json")]
    public string PayloadJson { get; set; } = string.Empty;

    [Column("status")]
    public OutboxStatus Status { get; set; } = OutboxStatus.Pending;

    [Column("retry_count")]
    public int RetryCount { get; set; }

    /// <summary>
    /// Earliest UTC time at which the processor should attempt delivery.
    /// On enqueue: `DateTime.UtcNow` (immediate). On retry: now + backoff.
    /// </summary>
    [Column("next_attempt_at")]
    public DateTime NextAttemptAt { get; set; } = DateTime.UtcNow;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Set when status moves to `Sent` or terminal `Failed`.
    /// </summary>
    [Column("processed_at")]
    public DateTime? ProcessedAt { get; set; }

    /// <summary>
    /// Truncated to 1000 chars in OutboxProcessor before persist.
    /// </summary>
    [Column("last_error")]
    public string? LastError { get; set; }
}

public enum OutboxStatus
{
    Pending = 0,
    Processing = 1,
    Sent = 2,
    Failed = 3
}

/// <summary>
/// Each value corresponds to a specific dispatch path in OutboxProcessor.
/// When adding a new type, also update OutboxProcessor.DispatchAsync.
/// </summary>
public enum NotificationOutboxType
{
    /// <summary>
    /// POST to Mobile API `/api/internal/push-notify`.
    /// Payload shape: <see cref="MobilePushPayload"/>.
    /// </summary>
    MobileRouteCancelled = 0,

    /// <summary>
    /// POST to Mobile API `/api/internal/push-notify`.
    /// Payload shape: <see cref="MobilePushPayload"/>.
    /// </summary>
    MobileRouteAssignment = 1,

    /// <summary>
    /// SignalR event to a specific user via IRealtimePushService.
    /// Payload shape: <see cref="SignalRUserEventPayload"/>.
    /// </summary>
    RouteAssignedSignalR = 2,

    /// <summary>
    /// POST to Mobile API `/api/internal/push-notify`.
    /// Payload shape: <see cref="MobilePushPayload"/>.
    /// </summary>
    MobileRouteSentToLoad = 3
}

/// <summary>
/// Canonical payload for any Mobile API push-notify call.
/// Mirrors the inline anonymous object that all 3 mobile Task.Run callsites
/// were sending — kept here so OutboxProcessor can serialize once and reuse.
/// </summary>
public sealed class MobilePushPayload
{
    public int TenantId { get; set; }
    public int[] UserIds { get; set; } = Array.Empty<int>();
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public Dictionary<string, string> Data { get; set; } = new();
}

/// <summary>
/// Canonical payload for SignalR per-user events
/// (IRealtimePushService.SendEventToUserAsync).
/// </summary>
public sealed class SignalRUserEventPayload
{
    public int UserId { get; set; }
    public string EventName { get; set; } = string.Empty;
    /// <summary>
    /// Pre-serialized event body (already JSON). OutboxProcessor will deserialize
    /// into a JsonElement before re-sending so SignalR client sees the same shape.
    /// </summary>
    public string EventBodyJson { get; set; } = "{}";
}
