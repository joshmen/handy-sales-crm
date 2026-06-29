using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Chatbot.Api.Models;

/// <summary>Un mensaje individual dentro de una conversacion.</summary>
public class ChatMessage
{
    public long Id { get; set; }

    public int ConversationId { get; set; }
    public Conversation? Conversation { get; set; }

    public MessageRole Role { get; set; }

    public string Content { get; set; } = "";

    /// <summary>
    /// Confianza del RAG para los mensajes del bot (0..1). Null para visitor/agent/system.
    /// Si es baja (&lt; umbral) se dispara handoff.
    /// </summary>
    public double? Confidence { get; set; }

    /// <summary>
    /// Citas/fuentes KB usadas por el bot, serializadas como JSON (jsonb).
    /// Ej: [{"slug":"precios","title":"Planes","score":0.83}]. Null si no aplica.
    /// </summary>
    [Column(TypeName = "jsonb")]
    public string? Sources { get; set; }

    /// <summary>Id del agente humano que escribio (si Role == Agent).</summary>
    public string? AgentId { get; set; }

    /// <summary>Tokens consumidos por el modelo (si Role == Bot), para telemetria de costo.</summary>
    public int? TokensUsed { get; set; }

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}
