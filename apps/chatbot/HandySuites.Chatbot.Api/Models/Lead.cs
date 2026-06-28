namespace HandySuites.Chatbot.Api.Models;

/// <summary>
/// Lead capturado durante una conversacion del chatbot (handoff / captura progresiva).
/// LFPDPPP: no se persiste PII (name/email/phone/company) salvo que Consent == true.
/// </summary>
public class Lead
{
    public int Id { get; set; }

    /// <summary>Conversacion de origen (unica por lead). Opcional: un lead puede crearse sin conversacion.</summary>
    public int? ConversationId { get; set; }
    public Conversation? Conversation { get; set; }

    // --- PII (solo con consentimiento) ---
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Company { get; set; }

    /// <summary>Tamano de empresa declarado (ej. "1-5", "6-20", "20+"). Captura progresiva.</summary>
    public string? CompanySize { get; set; }

    /// <summary>Mensaje libre del visitante asociado al lead.</summary>
    public string? Message { get; set; }

    // --- Clasificacion ---
    /// <summary>Intencion inferida (ej. "pricing", "demo", "soporte").</summary>
    public string? Intent { get; set; }

    /// <summary>Motivo del handoff (ej. "explicit", "low_confidence", "intent_demo").</summary>
    public string? Reason { get; set; }

    /// <summary>Origen/canal del lead (ej. "chatbot-web").</summary>
    public string? Source { get; set; }

    // --- Consentimiento LFPDPPP ---
    /// <summary>El visitante acepto el aviso de privacidad. Sin esto, no se guarda PII.</summary>
    public bool Consent { get; set; }
    public DateTime? ConsentAt { get; set; }

    // --- Conversion a cliente (Fase 2) ---
    public int? ConvertedClienteId { get; set; }
    public int? ConvertedTenantId { get; set; }

    /// <summary>True si ya se notifico al asesor por este lead (idempotencia de notificacion).</summary>
    public bool Notificado { get; set; }

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public DateTime? ActualizadoEn { get; set; }
}
