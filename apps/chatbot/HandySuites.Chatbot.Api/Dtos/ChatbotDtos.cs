namespace HandySuites.Chatbot.Api.Dtos;

// ── PUBLIC ──
public record StartConversationRequest(string? VisitorId, string? OriginPage);
public record StartConversationResponse(Guid PublicId, string Status);

public record ChatRequest(string Message);

/// <summary>Datos de lead que el widget manda en /handoff (campos en espanol del widget).</summary>
public record HandoffLead(string? Nombre, string? Email, string? Telefono, string? Mensaje);
public record HandoffRequest(HandoffLead? Lead, string? Reason, bool Consent = false, string? RecaptchaToken = null);

public record LeadRequest(
    string? Name, string? Email, string? Phone, string? Company, string? CompanySize,
    string? Message, string? Intent, bool Consent = false, string? RecaptchaToken = null);

// ── INTERNAL (KB ingest) ──
public record KbIngestDoc(string Slug, string Title, string Content, string? Category = null, string? SourceUrl = null);
public record KbIngestRequest(List<KbIngestDoc> Documents);
public record KbIngestResult(int Documents, int Chunks, int Skipped);

// ── RAG internos ──
public record KbHit(string Slug, string Title, string ChunkText, double Score);
