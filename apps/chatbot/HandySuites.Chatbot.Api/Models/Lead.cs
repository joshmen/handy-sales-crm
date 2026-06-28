namespace HandySuites.Chatbot.Api.Models;

/// <summary>
/// Lead capturado durante una conversacion del chatbot (formulario de contacto / handoff).
/// </summary>
public class Lead
{
    public int Id { get; set; }

    /// <summary>Conversacion de origen (opcional: un lead puede crearse sin conversacion previa).</summary>
    public int? ConversationId { get; set; }
    public Conversation? Conversation { get; set; }

    public string Name { get; set; } = "";
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Company { get; set; }
    public string? Message { get; set; }

    /// <summary>Origen/canal del lead (ej. "chatbot-web").</summary>
    public string? Source { get; set; }

    public bool Notificado { get; set; }

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}
