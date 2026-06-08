using System.Net.Http.Json;
using System.Text.Json;
using HandySuites.Application.Notifications.Interfaces;
using HandySuites.Domain.Notifications;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Workers;

/// <summary>
/// H-2 Outbox MVP processor. Polls every 30s for `Pending` rows whose
/// `NextAttemptAt <= UtcNow`, dispatches them to the correct downstream
/// (Mobile API push-notify or SignalR), and marks `Sent` on success or
/// re-schedules with exponential backoff on failure.
///
/// Backoff schedule (per RetryCount):
///   1 -> +1 minute
///   2 -> +5 minutes
///   3 -> +30 minutes
///   4 -> terminal `Failed` (no further retries)
///
/// All dispatches happen in a per-row try/catch so one bad payload cannot
/// block the rest of the batch. Errors are persisted to `LastError`
/// (truncated to 1000 chars) for diagnostics.
/// </summary>
public class OutboxProcessor : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<OutboxProcessor> _logger;

    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);
    private const int BatchSize = 50;
    private const int MaxRetryCount = 3;
    private const int MaxLastErrorChars = 1000;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public OutboxProcessor(IServiceProvider services, ILogger<OutboxProcessor> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OutboxProcessor started (poll interval: {Interval}, batch: {Batch})",
            PollInterval, BatchSize);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OutboxProcessor batch failed; will retry on next tick");
            }

            try
            {
                await Task.Delay(PollInterval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HandySuitesDbContext>();
        var httpFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var realtimePush = scope.ServiceProvider.GetService<IRealtimePushService>();

        var now = DateTime.UtcNow;
        var batch = await db.NotificationOutbox
            .Where(o => o.Status == OutboxStatus.Pending && o.NextAttemptAt <= now)
            .OrderBy(o => o.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (batch.Count == 0) return;

        _logger.LogDebug("OutboxProcessor picked up {Count} pending notifications", batch.Count);

        foreach (var row in batch)
        {
            try
            {
                await DispatchAsync(row, httpFactory, realtimePush, ct);
                row.Status = OutboxStatus.Sent;
                row.ProcessedAt = DateTime.UtcNow;
                row.LastError = null;
            }
            catch (Exception ex)
            {
                row.RetryCount++;
                row.LastError = Truncate(ex.Message, MaxLastErrorChars);

                if (row.RetryCount > MaxRetryCount)
                {
                    row.Status = OutboxStatus.Failed;
                    row.ProcessedAt = DateTime.UtcNow;
                    _logger.LogWarning(ex,
                        "Outbox row {Id} type {Type} reached max retries ({Retries}); marked Failed",
                        row.Id, row.NotificationType, row.RetryCount);
                }
                else
                {
                    row.NextAttemptAt = DateTime.UtcNow + BackoffFor(row.RetryCount);
                    _logger.LogInformation(ex,
                        "Outbox row {Id} type {Type} attempt {Retry} failed; will retry at {Next}",
                        row.Id, row.NotificationType, row.RetryCount, row.NextAttemptAt);
                }
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private static TimeSpan BackoffFor(int retryCount) => retryCount switch
    {
        1 => TimeSpan.FromMinutes(1),
        2 => TimeSpan.FromMinutes(5),
        _ => TimeSpan.FromMinutes(30),
    };

    private static string Truncate(string s, int max) =>
        string.IsNullOrEmpty(s) || s.Length <= max ? s : s[..max];

    private async Task DispatchAsync(
        NotificationOutbox row,
        IHttpClientFactory httpFactory,
        IRealtimePushService? realtimePush,
        CancellationToken ct)
    {
        switch (row.NotificationType)
        {
            case NotificationOutboxType.MobileRouteCancelled:
            case NotificationOutboxType.MobileRouteAssignment:
            case NotificationOutboxType.MobileRouteSentToLoad:
            {
                var payload = JsonSerializer.Deserialize<MobilePushPayload>(row.PayloadJson, JsonOpts)
                    ?? throw new InvalidOperationException(
                        $"Outbox {row.Id}: failed to deserialize MobilePushPayload");
                var client = httpFactory.CreateClient("MobileApi");
                var resp = await client.PostAsJsonAsync("/api/internal/push-notify", new
                {
                    tenantId = payload.TenantId,
                    userIds = payload.UserIds,
                    title = payload.Title,
                    body = payload.Body,
                    data = payload.Data,
                }, ct);
                if (!resp.IsSuccessStatusCode)
                {
                    var snippet = await SafeReadSnippetAsync(resp, ct);
                    throw new InvalidOperationException(
                        $"Mobile API push-notify returned {(int)resp.StatusCode}: {snippet}");
                }
                break;
            }

            case NotificationOutboxType.RouteAssignedSignalR:
            {
                if (realtimePush is null)
                    throw new InvalidOperationException(
                        $"Outbox {row.Id}: IRealtimePushService not registered");
                var payload = JsonSerializer.Deserialize<SignalRUserEventPayload>(row.PayloadJson, JsonOpts)
                    ?? throw new InvalidOperationException(
                        $"Outbox {row.Id}: failed to deserialize SignalRUserEventPayload");
                // Re-hydrate event body as JsonElement so the SignalR client sees
                // the same anonymous-object shape that the original Task.Run sent.
                using var doc = JsonDocument.Parse(payload.EventBodyJson);
                await realtimePush.SendEventToUserAsync(
                    payload.UserId, payload.EventName, doc.RootElement.Clone());
                break;
            }

            default:
                throw new InvalidOperationException(
                    $"Outbox {row.Id}: unknown NotificationType {row.NotificationType}");
        }
    }

    private static async Task<string> SafeReadSnippetAsync(HttpResponseMessage resp, CancellationToken ct)
    {
        try
        {
            var body = await resp.Content.ReadAsStringAsync(ct);
            return body.Length > 200 ? body[..200] : body;
        }
        catch
        {
            return "<no body>";
        }
    }
}
