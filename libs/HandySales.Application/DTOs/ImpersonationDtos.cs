namespace HandySales.Application.DTOs;

/// <summary>
/// Request para iniciar una sesión de impersonación
/// </summary>
public record StartImpersonationRequest
{
    /// <summary>
    /// ID del tenant a impersonar
    /// </summary>
    public int TargetTenantId { get; init; }

    /// <summary>
    /// Razón/justificación (obligatorio)
    /// </summary>
    public string Reason { get; init; } = string.Empty;

    /// <summary>
    /// Número de ticket de soporte (opcional pero recomendado)
    /// </summary>
    public string? TicketNumber { get; init; }

    /// <summary>
    /// Nivel de acceso solicitado (default: READ_ONLY)
    /// </summary>
    public string AccessLevel { get; init; } = "READ_ONLY";
}

/// <summary>
/// Response al iniciar impersonación
/// </summary>
public record StartImpersonationResponse
{
    /// <summary>
    /// ID de la sesión de impersonación
    /// </summary>
    public Guid SessionId { get; init; }

    /// <summary>
    /// Token JWT temporal para la sesión impersonada
    /// </summary>
    public string ImpersonationToken { get; init; } = string.Empty;

    /// <summary>
    /// Nombre del tenant impersonado
    /// </summary>
    public string TenantName { get; init; } = string.Empty;

    /// <summary>
    /// Nivel de acceso otorgado
    /// </summary>
    public string AccessLevel { get; init; } = string.Empty;

    /// <summary>
    /// Tiempo de expiración de la sesión
    /// </summary>
    public DateTime ExpiresAt { get; init; }
}

/// <summary>
/// Request para terminar una sesión de impersonación
/// </summary>
public record EndImpersonationRequest
{
    /// <summary>
    /// ID de la sesión a terminar
    /// </summary>
    public Guid SessionId { get; init; }
}

/// <summary>
/// Request para registrar una acción durante impersonación
/// </summary>
public record LogImpersonationActionRequest
{
    /// <summary>
    /// ID de la sesión activa
    /// </summary>
    public Guid SessionId { get; init; }

    /// <summary>
    /// Tipo de acción (PAGE_VISIT, API_CALL, DATA_EXPORT, etc.)
    /// </summary>
    public string ActionType { get; init; } = string.Empty;

    /// <summary>
    /// Descripción de la acción
    /// </summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Ruta o endpoint accedido
    /// </summary>
    public string? Path { get; init; }
}

/// <summary>
/// DTO para listar sesiones de impersonación (historial)
/// </summary>
public record ImpersonationSessionDto
{
    public Guid Id { get; init; }
    public int SuperAdminId { get; init; }
    public string SuperAdminEmail { get; init; } = string.Empty;
    public string SuperAdminName { get; init; } = string.Empty;
    public int TargetTenantId { get; init; }
    public string TargetTenantName { get; init; } = string.Empty;
    public string Reason { get; init; } = string.Empty;
    public string? TicketNumber { get; init; }
    public string AccessLevel { get; init; } = string.Empty;
    public DateTime StartedAt { get; init; }
    public DateTime? EndedAt { get; init; }
    public DateTime ExpiresAt { get; init; }
    public string Status { get; init; } = string.Empty;
    public int ActionsCount { get; init; }
    public int PagesVisitedCount { get; init; }
    public string DurationFormatted { get; init; } = string.Empty;
}

/// <summary>
/// Filtros para consultar historial de impersonación
/// </summary>
public record ImpersonationHistoryFilter
{
    public int? SuperAdminId { get; init; }
    public int? TargetTenantId { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public string? Status { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

/// <summary>
/// Response paginado del historial
/// </summary>
public record ImpersonationHistoryResponse
{
    public List<ImpersonationSessionDto> Sessions { get; init; } = new();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages { get; init; }
}

/// <summary>
/// DTO para el estado actual de impersonación del usuario
/// </summary>
public record CurrentImpersonationState
{
    /// <summary>
    /// ¿Está en sesión de impersonación?
    /// </summary>
    public bool IsImpersonating { get; init; }

    /// <summary>
    /// ID de la sesión activa (null si no está impersonando)
    /// </summary>
    public Guid? SessionId { get; init; }

    /// <summary>
    /// Datos del tenant impersonado
    /// </summary>
    public ImpersonatedTenantInfo? Tenant { get; init; }

    /// <summary>
    /// Tiempo restante en minutos
    /// </summary>
    public int? MinutesRemaining { get; init; }

    /// <summary>
    /// Nivel de acceso
    /// </summary>
    public string? AccessLevel { get; init; }
}

/// <summary>
/// Info básica del tenant impersonado
/// </summary>
public record ImpersonatedTenantInfo
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? LogoUrl { get; init; }
}
