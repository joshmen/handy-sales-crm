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

    public ChatChannel Channel { get; set; } = ChatChannel.Web;
    public ConversationStatus Status { get; set; } = ConversationStatus.Bot;
    public ConversationMode Mode { get; set; } = ConversationMode.Bot;

    /// <summary>Agente (SUPER_ADMIN) que tomo la conversacion, si fue escalada.</summary>
    public string? AssignedAgentId { get; set; }

    /// <summary>Datos opcionales del visitante (capturados o inferidos).</summary>
    public string? VisitorName { get; set; }
    public string? VisitorEmail { get; set; }
    public string? VisitorIp { get; set; }

    /// <summary>Numero de mensajes del visitante sin leer por el agente.</summary>
    public int UnreadForAgent { get; set; }

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime? ActualizadoEn { get; set; }
    public DateTime? CerradoEn { get; set; }

    public List<ChatMessage> Messages { get; set; } = new();
}
