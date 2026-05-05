using System.Net.Http.Json;
using System.Text.Json;
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
    /// Send push notification to a specific user (all their devices).
    /// </summary>
    public Task<PushResult> SendToUserAsync(int userId, int tenantId, string title, string body, Dictionary<string, string>? data = null)
        => SendToUsersAsync(new List<int> { userId }, tenantId, title, body, data);

    /// <summary>
    /// Send push notification to multiple users.
    ///
    /// Persiste un registro <see cref="NotificationHistory"/> por userId con
    /// <c>Status = Pending</c> ANTES de mandar a Expo. Inyecta el id en
    /// <c>data.notificationHistoryId</c> para que el mobile pueda dedup vs
    /// el GET /api/mobile/notificaciones (sync incremental). Tras la
    /// respuesta de Expo, batch update a Sent o Failed con errorMessage.
    /// </summary>
    public async Task<PushResult> SendToUsersAsync(List<int> userIds, int tenantId, string title, string body, Dictionary<string, string>? data = null)
    {
        if (userIds == null || userIds.Count == 0)
            return new PushResult(false, 0, "Sin destinatarios");

        var distinctIds = userIds.Distinct().ToList();
        var tipo = MapTipo(data);
        var dataJson = data != null ? JsonSerializer.Serialize(data) : null;

        // 1. Persistir un NotificationHistory por usuario destino (Pending).
        var nowUtc = DateTime.UtcNow;
        var nhByUser = new Dictionary<int, NotificationHistory>(distinctIds.Count);
        foreach (var uid in distinctIds)
        {
            var nh = new NotificationHistory
            {
                TenantId = tenantId,
                UsuarioId = uid,
                Titulo = title,
                Mensaje = body,
                Tipo = tipo,
                Status = NotificationStatus.Pending,
                DataJson = dataJson,
                CreadoEn = nowUtc,
            };
            _db.NotificationHistory.Add(nh);
            nhByUser[uid] = nh;
        }
        await _db.SaveChangesAsync(); // ahora cada nh.Id está populated

        // 2. Cargar device sessions (token + userId) para todos los destinatarios.
        var sessions = await _db.DeviceSessions
            .IgnoreQueryFilters()
            .Where(ds => distinctIds.Contains(ds.UsuarioId) &&
                         ds.TenantId == tenantId &&
                         ds.PushToken != null &&
                         ds.Status == SessionStatus.Active &&
                         ds.EliminadoEn == null)
            .Select(ds => new { ds.UsuarioId, ds.PushToken })
            .ToListAsync();

        if (sessions.Count == 0)
        {
            // Sin devices: marcar todos los NH como Failed con motivo claro.
            const string err = "No hay dispositivos registrados con push token activo";
            foreach (var nh in nhByUser.Values)
            {
                nh.Status = NotificationStatus.Failed;
                nh.ErrorMessage = err;
            }
            await _db.SaveChangesAsync();
            return new PushResult(false, 0, err);
        }

        // 3. Construir mensajes per-token con nhId inyectado del usuario dueño.
        var perToken = sessions
            .Where(s => nhByUser.ContainsKey(s.UsuarioId))
            .Select(s => new PerTokenPayload(s.PushToken!, s.UsuarioId, nhByUser[s.UsuarioId].Id))
            .ToList();

        var totalSent = 0;
        var sentUsers = new HashSet<int>();
        var failedUsers = new HashSet<int>();
        string? lastError = null;

        // 4. Chunk a Expo (max 100/req). Status per-user en función del éxito
        //    del chunk donde fue enviado (granularidad aceptable).
        foreach (var chunk in perToken.Chunk(100))
        {
            var messages = chunk.Select(p =>
            {
                var payloadData = data != null
                    ? new Dictionary<string, string>(data)
                    : new Dictionary<string, string>();
                payloadData["notificationHistoryId"] = p.NhId.ToString();

                return new
                {
                    to = p.Token,
                    title,
                    body,
                    sound = "default",
                    data = payloadData,
                    channelId = GetChannelId(payloadData),
                    priority = "high",
                };
            }).ToList();

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, ExpoPushUrl);
                request.Headers.Add("Accept", "application/json");
                request.Headers.Add("Accept-Encoding", "gzip, deflate");

                var accessToken = Environment.GetEnvironmentVariable("EXPO_ACCESS_TOKEN");
                if (!string.IsNullOrEmpty(accessToken))
                    request.Headers.Add("Authorization", $"Bearer {accessToken}");

                request.Content = JsonContent.Create(messages);

                var response = await _http.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    totalSent += chunk.Length;
                    foreach (var p in chunk) sentUsers.Add(p.UserId);
                    _logger.LogInformation("Push sent to {Count} devices. Response: {Response}", chunk.Length, responseBody);
                }
                else
                {
                    foreach (var p in chunk) failedUsers.Add(p.UserId);
                    lastError = $"{(int)response.StatusCode} {responseBody}";
                    _logger.LogWarning("Expo Push API error: {Status} {Response}", response.StatusCode, responseBody);
                }
            }
            catch (Exception ex)
            {
                foreach (var p in chunk) failedUsers.Add(p.UserId);
                lastError = ex.Message;
                _logger.LogError(ex, "Failed to send push notification batch");
            }
        }

        // 5. Update Status final por NH.
        foreach (var (uid, nh) in nhByUser)
        {
            if (sentUsers.Contains(uid))
            {
                nh.Status = NotificationStatus.Sent;
                nh.EnviadoEn = DateTime.UtcNow;
            }
            else if (failedUsers.Contains(uid))
            {
                nh.Status = NotificationStatus.Failed;
                nh.ErrorMessage = lastError ?? "Expo push API failure";
            }
            else
            {
                // Usuario sin device session → Failed con motivo distinto.
                nh.Status = NotificationStatus.Failed;
                nh.ErrorMessage = "No active device session for user";
            }
        }
        await _db.SaveChangesAsync();

        if (totalSent > 0)
            return new PushResult(true, totalSent, $"Enviado a {totalSent} dispositivo(s)");

        return new PushResult(false, 0, lastError ?? "Error al enviar notificaciones");
    }

    /// <summary>
    /// Send push notification to all active devices in a tenant (broadcast).
    /// No persiste NotificationHistory porque no hay destinatario individual
    /// — el caso de uso es alertas globales de tenant. Si se necesita
    /// histórico por user para un broadcast, el caller debe enumerar userIds.
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

        return await SendToTokensRawAsync(tokens, title, body, data);
    }

    /// <summary>
    /// Send push to specific Expo Push Tokens via Expo Push API (sin persist).
    /// Solo para SendToTenantAsync (broadcast). Docs:
    /// https://docs.expo.dev/push-notifications/sending-notifications/
    /// Max 100 per request, 600/sec per project, 4KB payload max.
    /// </summary>
    private async Task<PushResult> SendToTokensRawAsync(List<string> tokens, string title, string body, Dictionary<string, string>? data)
    {
        var totalSent = 0;

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

    private static NotificationType MapTipo(Dictionary<string, string>? data)
    {
        if (data == null || !data.TryGetValue("type", out var type) || string.IsNullOrEmpty(type))
            return NotificationType.General;

        if (type.StartsWith("order")) return NotificationType.Order;
        if (type.StartsWith("route")) return NotificationType.Route;
        if (type.StartsWith("visit")) return NotificationType.Visit;
        if (type.StartsWith("security") || type.StartsWith("stock") || type.StartsWith("alert"))
            return NotificationType.Alert;
        if (type.StartsWith("system")) return NotificationType.System;
        return NotificationType.General;
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

    private record PerTokenPayload(string Token, int UserId, int NhId);
}

public record PushResult(bool Success, int DeviceCount, string Message);
