using System.Text.Json;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Domain.Notifications;
using HandySuites.Infrastructure.Persistence;

namespace HandySuites.Infrastructure.Notifications.Outbox;

/// <inheritdoc cref="IOutboxService"/>
public class OutboxService : IOutboxService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        // Match the original anonymous-object shape (camelCase) that the Mobile
        // API and the SignalR client already expect — they were sent that way
        // by the previous fire-and-forget Task.Run paths via PostAsJsonAsync.
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly HandySuitesDbContext _db;

    public OutboxService(HandySuitesDbContext db) => _db = db;

    public Task<int> EnqueueAsync(
        int tenantId,
        NotificationOutboxType type,
        object payload,
        CancellationToken ct = default)
    {
        var row = new NotificationOutbox
        {
            TenantId = tenantId,
            NotificationType = type,
            PayloadJson = JsonSerializer.Serialize(payload, JsonOpts),
            Status = OutboxStatus.Pending,
            RetryCount = 0,
            NextAttemptAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
        };
        _db.NotificationOutbox.Add(row);
        // NOTE: deliberately NOT calling SaveChangesAsync — caller commits
        // alongside their business write so the enqueue is transactional.
        // Until then `row.Id == 0`; we return it as a Task<int> reference,
        // but in practice all current callers discard the value.
        return Task.FromResult(row.Id);
    }
}
