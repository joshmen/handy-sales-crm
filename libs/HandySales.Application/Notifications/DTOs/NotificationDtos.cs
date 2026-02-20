namespace HandySales.Application.Notifications.DTOs;

/// <summary>
/// DTO para enviar notificación a un usuario específico
/// </summary>
public class SendNotificationDto
{
    public int UsuarioId { get; set; }
    public required string Titulo { get; set; }
    public required string Mensaje { get; set; }
    public string Tipo { get; set; } = "General";
    public Dictionary<string, string>? Data { get; set; }
}

/// <summary>
/// DTO para enviar notificación masiva (broadcast)
/// </summary>
public class BroadcastNotificationDto
{
    public required string Titulo { get; set; }
    public required string Mensaje { get; set; }
    public string Tipo { get; set; } = "General";
    public Dictionary<string, string>? Data { get; set; }
    public List<int>? UsuarioIds { get; set; } // Si está vacío, envía a todos
    public int? ZonaId { get; set; } // Filtro opcional por zona
    public bool SoloVendedores { get; set; } = false;
}

/// <summary>
/// DTO para registro de push token
/// </summary>
public class RegisterPushTokenDto
{
    public required string PushToken { get; set; }
    public int SessionId { get; set; }
}

/// <summary>
/// DTO de respuesta de notificación
/// </summary>
public class NotificationDto
{
    public int Id { get; set; }
    public required string Titulo { get; set; }
    public required string Mensaje { get; set; }
    public required string Tipo { get; set; }
    public required string Status { get; set; }
    public Dictionary<string, string>? Data { get; set; }
    public DateTime? EnviadoEn { get; set; }
    public DateTime? LeidoEn { get; set; }
    public DateTime CreadoEn { get; set; }
}

/// <summary>
/// DTO para listar notificaciones con paginación
/// </summary>
public class NotificationFiltroDto
{
    public string? Tipo { get; set; }
    public bool? NoLeidas { get; set; }
    public DateTime? Desde { get; set; }
    public DateTime? Hasta { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
}

/// <summary>
/// Resultado paginado de notificaciones
/// </summary>
public class NotificationPaginatedResult
{
    public List<NotificationDto> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int NoLeidas { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalPaginas => (int)Math.Ceiling((double)TotalItems / TamanoPagina);
}

/// <summary>
/// Resultado del envío de notificación
/// </summary>
public class NotificationSendResultDto
{
    public bool Success { get; set; }
    public int NotificationId { get; set; }
    public string? MessageId { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Resultado del envío broadcast
/// </summary>
public class BroadcastResultDto
{
    public int TotalEnviados { get; set; }
    public int TotalExitosos { get; set; }
    public int TotalFallidos { get; set; }
    public List<NotificationSendResultDto> Resultados { get; set; } = new();
    public List<int> NotifiedUserIds { get; set; } = new();
}
