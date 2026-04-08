using System.Net.Http.Json;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Services;

public class PushNotificationService
{
    private readonly HandySuitesDbContext _db;
    private readonly HttpClient _http;
    private readonly ILogger<PushNotificationService> _logger;
    private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";

    public PushNotificationService(
        HandySuitesDbContext db,
        HttpClient http,
        ILogger<PushNotificationService> logger)
    {
        _db = db;
        _http = http;
        _logger = logger;
    }

    /// <summary>
    /// Send push notification to a specific user (all their devices)
    /// </summary>
    public async Task<PushResult> SendToUserAsync(int userId, int tenantId, string title, string body, Dictionary<string, string>? data = null)
    {
        var tokens = await GetActiveTokensAsync(userId, tenantId);
        if (tokens.Count == 0)
            return new PushResult(false, 0, "No hay dispositivos registrados para este usuario");

        return await SendToTokensAsync(tokens, title, body, data);
    }

    /// <summary>
    /// Send push notification to multiple users
    /// </summary>
    public async Task<PushResult> SendToUsersAsync(List<int> userIds, int tenantId, string title, string body, Dictionary<string, string>? data = null)
    {
        var tokens = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => userIds.Contains(ds.UsuarioId) &&
                         ds.TenantId == tenantId &&
                         ds.PushToken != null &&
                         ds.Status == SessionStatus.Active &&
                         ds.EliminadoEn == null)
            .Select(ds => ds.PushToken!)
            .Distinct()
            .ToListAsync();

        if (tokens.Count == 0)
            return new PushResult(false, 0, "No hay dispositivos registrados para estos usuarios");

        return await SendToTokensAsync(tokens, title, body, data);
    }

    /// <summary>
    /// Send push notification to all active devices in a tenant
    /// </summary>
    public async Task<PushResult> SendToTenantAsync(int tenantId, string title, string body, Dictionary<string, string>? data = null)
    {
        var tokens = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => ds.TenantId == tenantId &&
                         ds.PushToken != null &&
                         ds.Status == SessionStatus.Active &&
                         ds.EliminadoEn == null)
            .Select(ds => ds.PushToken!)
            .Distinct()
            .ToListAsync();

        if (tokens.Count == 0)
            return new PushResult(false, 0, "No hay dispositivos registrados en esta empresa");

        return await SendToTokensAsync(tokens, title, body, data);
    }

    /// <summary>
    /// Send push to specific Expo Push Tokens via Expo Push API.
    /// Docs: https://docs.expo.dev/push-notifications/sending-notifications/
    /// Max 100 per request, 600/sec per project, 4KB payload max.
    /// </summary>
    private async Task<PushResult> SendToTokensAsync(List<string> tokens, string title, string body, Dictionary<string, string>? data)
    {
        var totalSent = 0;

        // Expo Push API accepts up to 100 messages per request — chunk if needed
        foreach (var chunk in tokens.Chunk(100))
        {
            var messages = chunk.Select(token => new
            {
                to = token,
                title,
                body,
                sound = "default",
                data = data ?? new Dictionary<string, string>(),
                channelId = GetChannelId(data),
                priority = "high"
            }).ToList();

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, ExpoPushUrl);
                request.Headers.Add("Accept", "application/json");
                request.Headers.Add("Accept-Encoding", "gzip, deflate");

                // Optional: Expo Access Token for enhanced push security
                var accessToken = Environment.GetEnvironmentVariable("EXPO_ACCESS_TOKEN");
                if (!string.IsNullOrEmpty(accessToken))
                    request.Headers.Add("Authorization", $"Bearer {accessToken}");

                request.Content = JsonContent.Create(messages);

                var response = await _http.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    totalSent += chunk.Length;
                    _logger.LogInformation("Push sent to {Count} devices. Response: {Response}", chunk.Length, responseBody);
                }
                else
                {
                    _logger.LogWarning("Expo Push API error: {Status} {Response}", response.StatusCode, responseBody);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send push notification batch");
            }
        }

        if (totalSent > 0)
            return new PushResult(true, totalSent, $"Enviado a {totalSent} dispositivo(s)");

        return new PushResult(false, 0, "Error al enviar notificaciones");
    }

    private async Task<List<string>> GetActiveTokensAsync(int userId, int tenantId)
    {
        return await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => ds.UsuarioId == userId &&
                         ds.TenantId == tenantId &&
                         ds.PushToken != null &&
                         ds.Status == SessionStatus.Active &&
                         ds.EliminadoEn == null)
            .Select(ds => ds.PushToken!)
            .Distinct()
            .ToListAsync();
    }

    private static string GetChannelId(Dictionary<string, string>? data)
    {
        if (data == null || !data.TryGetValue("type", out var type))
            return "default";

        return type switch
        {
            "order.new" or "order.confirmed" or "order.processing"
                or "order.en_route" or "order.delivered" or "order.cancelled"
                or "order.assigned" or "order.status_changed" => "orders",
            "route.published" or "visit.reminder" => "routes",
            "cobro.new" or _ when type.StartsWith("collection") => "collections",
            "stock.low" or "goal.assigned" or "goal.achieved" => "default",
            "security.device_revoked" or "security.session_revoked" => "default",
            _ => "default"
        };
    }
}

public record PushResult(bool Success, int DeviceCount, string Message);
