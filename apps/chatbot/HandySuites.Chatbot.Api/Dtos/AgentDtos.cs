namespace HandySuites.Chatbot.Api.Dtos;

// ── Bandeja (lista + counts + KPIs) ──
public record InboxItem(
    int Id, Guid PublicId, string Status, string Mode, bool Taken,
    string? VisitorName, string? OriginPage, string? Device, string? Location,
    int UnreadForAgent, string? LastMessage, DateTime? LastVisitorAt, DateTime CreadoEn, bool HasLead);

public record InboxCounts(int Waiting, int Active, int Closed, int All);

/// <summary>KPIs del header de la bandeja.</summary>
public record InboxKpis(int Hoy, int Esperan, int Activas, int ResueltasBotPct);

public record InboxListResponse(List<InboxItem> Items, InboxCounts Counts, InboxKpis Kpis);

// ── Hilo (detalle) ──
public record ThreadMessage(long Id, string Role, string Content, DateTime CreadoEn, double? Confidence, string? AgentId);

public record InboxLead(
    string? Name, string? Email, string? Phone, string? Company, string? CompanySize,
    string? Intent, string? Reason, bool Consent);

public record ThreadResponse(
    int Id, Guid PublicId, string Status, string Mode, bool Taken, string? AssignedAgentId,
    string? VisitorName, string? VisitorEmail, string? OriginPage, string? Device, string? Location,
    DateTime CreadoEn, List<ThreadMessage> Messages, InboxLead? Lead);

public record AgentSendRequest(string Message);

public record BadgesResponse(int InboxWaiting);
