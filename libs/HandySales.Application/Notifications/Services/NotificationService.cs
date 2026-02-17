using System.Text.Json;
using HandySales.Application.DeviceSessions.Interfaces;
using HandySales.Application.Notifications.DTOs;
using HandySales.Application.Notifications.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Shared.Multitenancy;

namespace HandySales.Application.Notifications.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;
    private readonly IDeviceSessionRepository _deviceSessionRepository;
    private readonly ICurrentTenant _tenant;
    private readonly IFcmService _fcmService;

    public NotificationService(
        INotificationRepository repository,
        IDeviceSessionRepository deviceSessionRepository,
        ICurrentTenant tenant,
        IFcmService fcmService)
    {
        _repository = repository;
        _deviceSessionRepository = deviceSessionRepository;
        _tenant = tenant;
        _fcmService = fcmService;
    }

    public async Task<NotificationSendResultDto> EnviarNotificacionAsync(SendNotificationDto dto)
    {
        var result = new NotificationSendResultDto();

        try
        {
            // Parsear tipo de notificación
            var tipo = Enum.TryParse<NotificationType>(dto.Tipo, true, out var t) ? t : NotificationType.General;

            // Crear registro de notificación
            var notification = new NotificationHistory
            {
                TenantId = _tenant.TenantId,
                UsuarioId = dto.UsuarioId,
                Titulo = dto.Titulo,
                Mensaje = dto.Mensaje,
                Tipo = tipo,
                Status = NotificationStatus.Pending,
                DataJson = dto.Data != null ? JsonSerializer.Serialize(dto.Data) : null,
                CreadoEn = DateTime.UtcNow
            };

            notification = await _repository.CrearAsync(notification);
            result.NotificationId = notification.Id;

            // Obtener push tokens del usuario
            var tokens = await _repository.ObtenerPushTokensAsync(_tenant.TenantId, new List<int> { dto.UsuarioId });

            if (!tokens.Any())
            {
                await _repository.ActualizarEstadoAsync(notification.Id, NotificationStatus.Failed, null, "No hay dispositivos con push token registrados");
                result.Success = false;
                result.Error = "No hay dispositivos registrados para este usuario";
                return result;
            }

            // Enviar a todos los dispositivos del usuario
            var tokenStrings = tokens.Select(t => t.PushToken).ToList();
            var fcmResult = await _fcmService.EnviarMulticastAsync(tokenStrings, dto.Titulo, dto.Mensaje, dto.Data);

            if (fcmResult.Success)
            {
                await _repository.ActualizarEstadoAsync(notification.Id, NotificationStatus.Sent, fcmResult.MessageId);
                result.Success = true;
                result.MessageId = fcmResult.MessageId;
            }
            else
            {
                await _repository.ActualizarEstadoAsync(notification.Id, NotificationStatus.Failed, null, fcmResult.Error);
                result.Success = false;
                result.Error = fcmResult.Error;
            }
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Error = ex.Message;
        }

        return result;
    }

    public async Task<BroadcastResultDto> EnviarBroadcastAsync(BroadcastNotificationDto dto)
    {
        var result = new BroadcastResultDto();

        try
        {
            List<(int UsuarioId, int SessionId, string PushToken)> tokens;

            // Obtener tokens según filtros
            if (dto.SoloVendedores || dto.ZonaId.HasValue)
            {
                tokens = await _repository.ObtenerPushTokensVendedoresPorZonaAsync(_tenant.TenantId, dto.ZonaId);
            }
            else
            {
                tokens = await _repository.ObtenerPushTokensAsync(_tenant.TenantId, dto.UsuarioIds);
            }

            if (!tokens.Any())
            {
                return result;
            }

            var tipo = Enum.TryParse<NotificationType>(dto.Tipo, true, out var t) ? t : NotificationType.General;

            // Agrupar tokens por usuario para crear una notificación por usuario
            var tokensByUser = tokens.GroupBy(t => t.UsuarioId);

            foreach (var userTokens in tokensByUser)
            {
                var usuarioId = userTokens.Key;

                // Crear registro de notificación para este usuario
                var notification = new NotificationHistory
                {
                    TenantId = _tenant.TenantId,
                    UsuarioId = usuarioId,
                    Titulo = dto.Titulo,
                    Mensaje = dto.Mensaje,
                    Tipo = tipo,
                    Status = NotificationStatus.Pending,
                    DataJson = dto.Data != null ? JsonSerializer.Serialize(dto.Data) : null,
                    CreadoEn = DateTime.UtcNow
                };

                notification = await _repository.CrearAsync(notification);
                result.TotalEnviados++;

                var tokenStrings = userTokens.Select(t => t.PushToken).ToList();
                var fcmResult = await _fcmService.EnviarMulticastAsync(tokenStrings, dto.Titulo, dto.Mensaje, dto.Data);

                var sendResult = new NotificationSendResultDto
                {
                    NotificationId = notification.Id,
                    Success = fcmResult.Success,
                    MessageId = fcmResult.MessageId,
                    Error = fcmResult.Error
                };

                if (fcmResult.Success)
                {
                    await _repository.ActualizarEstadoAsync(notification.Id, NotificationStatus.Sent, fcmResult.MessageId);
                    result.TotalExitosos++;
                }
                else
                {
                    await _repository.ActualizarEstadoAsync(notification.Id, NotificationStatus.Failed, null, fcmResult.Error);
                    result.TotalFallidos++;
                }

                result.Resultados.Add(sendResult);
            }
        }
        catch (Exception ex)
        {
            // Log error
            Console.WriteLine($"Error en broadcast: {ex.Message}");
        }

        return result;
    }

    public async Task<NotificationPaginatedResult> ObtenerMisNotificacionesAsync(NotificationFiltroDto filtro)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.ObtenerPorUsuarioAsync(usuarioId, _tenant.TenantId, filtro);
    }

    public async Task<bool> MarcarComoLeidaAsync(int notificationId)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.MarcarComoLeidaAsync(notificationId, usuarioId, _tenant.TenantId);
    }

    public async Task<int> MarcarTodasComoLeidasAsync()
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.MarcarTodasComoLeidasAsync(usuarioId, _tenant.TenantId);
    }

    public async Task<int> ObtenerConteoNoLeidasAsync()
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.ObtenerConteoNoLeidasAsync(usuarioId, _tenant.TenantId);
    }

    public async Task<bool> EliminarNotificacionAsync(int notificationId)
    {
        var usuarioId = int.Parse(_tenant.UserId);
        return await _repository.EliminarAsync(notificationId, usuarioId, _tenant.TenantId);
    }

    public async Task<bool> RegistrarPushTokenAsync(RegisterPushTokenDto dto)
    {
        return await _deviceSessionRepository.ActualizarPushTokenAsync(dto.SessionId, dto.PushToken, _tenant.TenantId);
    }
}
