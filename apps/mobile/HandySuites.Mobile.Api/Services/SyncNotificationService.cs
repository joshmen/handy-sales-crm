using System.Text;
using System.Text.Json;

namespace HandySuites.Mobile.Api.Services;

/// <summary>
/// Bridge service: after a successful sync push from the mobile device,
/// notifies the Main API which dispatches SignalR events to admin web clients.
/// Uses HTTP service-to-service call (simpler than sharing SignalR infrastructure).
/// </summary>
public class SyncNotificationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<SyncNotificationService> _logger;

    public SyncNotificationService(HttpClient httpClient, ILogger<SyncNotificationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task NotificarSyncCompletado(int tenantId, int userId, string userName, SyncSummary summary)
    {
        try
        {
            var payload = new
            {
                tenantId,
                userId,
                userName,
                summary = new
                {
                    summary.PedidosCreados,
                    summary.PedidosActualizados,
                    summary.CobrosCreados,
                    summary.VisitasCreadas,
                    summary.ClientesCreados,
                    summary.TotalPushed,
                    summary.TotalPulled
                },
                timestamp = DateTime.UtcNow
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/api/internal/sync-notify", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Sync notification to Main API failed: {StatusCode}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            // Don't let notification failure break the sync response
            _logger.LogError(ex, "Error sending sync notification to Main API");
        }
    }
}

public class SyncSummary
{
    public int PedidosCreados { get; set; }
    public int PedidosActualizados { get; set; }
    public int CobrosCreados { get; set; }
    public int VisitasCreadas { get; set; }
    public int ClientesCreados { get; set; }
    public int TotalPushed { get; set; }
    public int TotalPulled { get; set; }
}
