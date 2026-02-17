namespace HandySales.Application.Notifications.Interfaces;

/// <summary>
/// Resultado del envío FCM
/// </summary>
public class FcmSendResult
{
    public bool Success { get; set; }
    public string? MessageId { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Servicio de Firebase Cloud Messaging
/// </summary>
public interface IFcmService
{
    /// <summary>
    /// Enviar notificación a un token específico
    /// </summary>
    Task<FcmSendResult> EnviarAsync(string token, string titulo, string mensaje, Dictionary<string, string>? data = null);

    /// <summary>
    /// Enviar notificación multicast a múltiples tokens
    /// </summary>
    Task<FcmSendResult> EnviarMulticastAsync(List<string> tokens, string titulo, string mensaje, Dictionary<string, string>? data = null);

    /// <summary>
    /// Verificar si el servicio está configurado
    /// </summary>
    bool IsConfigured { get; }
}
