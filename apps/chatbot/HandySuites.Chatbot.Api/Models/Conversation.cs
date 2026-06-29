namespace HandySuites.Chatbot.Api.Models;

/// <summary>
/// Conversacion del chatbot publico (visitante del sitio) que puede escalar a un agente humano.
/// PublicId es el identificador opaco expuesto al visitante anonimo (no se expone Id interno).
/// </summary>
public class Conversation
{
    public int Id { get; set; }

    /// <summary>Identificador opaco (GUID) usado en las rutas publicas /public/conversations/{publicId}.</summary>
    public Guid PublicId { get; set; } = Guid.NewGuid();

    /// <summary>Id anonimo persistido en localStorage del visitante (para reconectar/agrupar sesiones).</summary>
    public string? VisitorId { get; set; }

    public ChatChannel Channel { get; set; } = ChatChannel.Web;
    public ConversationStatus Status { get; set; } = ConversationStatus.Bot;
    public ConversationMode Mode { get; set; } = ConversationMode.Bot;

    /// <summary>
    /// Vencimiento del modo human (TTL deslizante). Si Mode==Human y UtcNow > ModeExpiresAt,
    /// el BackgroundService reanuda el bot. Null cuando Mode==Bot.
    /// </summary>
    public DateTime? ModeExpiresAt { get; set; }

    /// <summary>Agente (SUPER_ADMIN) que tomo la conversacion, si fue escalada.</summary>
    public string? AssignedAgentId { get; set; }

    /// <summary>True cuando un agente la tomo (status active). Espejo derivado para la bandeja.</summary>
    public bool Taken { get; set; }

    /// <summary>True si el bot resolvio la conversacion sin escalar (KPI de containment).</summary>
    public bool ResolvedByBot { get; set; }

    /// <summary>Datos opcionales del visitante (capturados o inferidos).</summary>
    public string? VisitorName { get; set; }
    public string? VisitorEmail { get; set; }

    /// <summary>IP del visitante, truncada/hash por LFPDPPP (no se guarda completa).</summary>
    public string? VisitorIp { get; set; }

    /// <summary>Pagina de origen desde donde se abrio el chat (ej. "/precios").</summary>
    public string? OriginPage { get; set; }

    /// <summary>Dispositivo/navegador inferido (User-Agent resumido) para la ficha de la bandeja.</summary>
    public string? Device { get; set; }

    /// <summary>Ubicacion aproximada (ciudad/pais) si esta disponible.</summary>
    public string? Location { get; set; }

    /// <summary>Numero de mensajes del visitante sin leer por el agente.</summary>
    public int UnreadForAgent { get; set; }

    /// <summary>Marca de tiempo del ultimo mensaje del visitante (orden/SLA en la bandeja).</summary>
    public DateTime? LastVisitorAt { get; set; }

    /// <summary>Marca de tiempo del ultimo mensaje del agente.</summary>
    public DateTime? LastAgentAt { get; set; }

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime? ActualizadoEn { get; set; }
    public DateTime? CerradoEn { get; set; }

    public List<ChatMessage> Messages { get; set; } = new();
}
