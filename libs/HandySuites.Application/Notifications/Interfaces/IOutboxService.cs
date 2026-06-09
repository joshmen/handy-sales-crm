using HandySuites.Domain.Notifications;

namespace HandySuites.Application.Notifications.Interfaces;

/// <summary>
/// H-2 Outbox MVP — replaces `_ = Task.Run(...)` fire-and-forget pattern for
/// side-effect notifications (mobile push, SignalR events). Callers enqueue
/// the payload inside the same transaction as their business write; the
/// OutboxProcessor BackgroundService picks up Pending rows every 30s and
/// dispatches them with exponential backoff retries.
///
/// Trade-off: callers no longer get an immediate failure signal if the
/// downstream mobile API is down — they get durability instead. Fits the
/// fire-and-forget use case exactly (UI never waited on these notifications
/// anyway; they raced against the user clicking "OK").
/// </summary>
public interface IOutboxService
{
    /// <summary>
    /// Append a notification to the outbox. Returns the row id (useful for
    /// trace correlation; callers normally discard it).
    ///
    /// Does NOT call SaveChangesAsync — that is the caller's responsibility
    /// so the enqueue commits atomically with the originating business write.
    /// </summary>
    Task<int> EnqueueAsync(
        int tenantId,
        NotificationOutboxType type,
        object payload,
        CancellationToken ct = default);
}
