using System.Text.Json;
using HandySales.Application.DTOs;
using HandySales.Application.Impersonation.Interfaces;
using HandySales.Application.Interfaces;
using HandySales.Application.Usuarios.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Shared.Security;
using Microsoft.Extensions.Logging;

namespace HandySales.Application.Impersonation.Services;

/// <summary>
/// Servicio de impersonación con auditoría completa.
/// Implementa la política de impersonación ética.
/// </summary>
public class ImpersonationService : IImpersonationService
{
    private readonly IImpersonationRepository _repository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly JwtTokenGenerator _tokenGenerator;
    private readonly ILogger<ImpersonationService> _logger;

    // Configuración
    private const int DefaultSessionMinutes = 60;
    private const int MaxSessionMinutes = 120;
    private const int MinReasonLength = 20;

    public ImpersonationService(
        IImpersonationRepository repository,
        ITenantRepository tenantRepository,
        IUsuarioRepository usuarioRepository,
        JwtTokenGenerator tokenGenerator,
        ILogger<ImpersonationService> logger)
    {
        _repository = repository;
        _tenantRepository = tenantRepository;
        _usuarioRepository = usuarioRepository;
        _tokenGenerator = tokenGenerator;
        _logger = logger;
    }

    public async Task<StartImpersonationResponse> StartSessionAsync(
        StartImpersonationRequest request,
        int superAdminId,
        string ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        // Validaciones
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length < MinReasonLength)
        {
            throw new ArgumentException($"La justificación debe tener al menos {MinReasonLength} caracteres.");
        }

        // Verificar que no hay sesión activa
        var existingSession = await _repository.GetActiveSessionForUserAsync(superAdminId);
        if (existingSession != null)
        {
            throw new InvalidOperationException("Ya tienes una sesión de impersonación activa. Finalízala antes de iniciar otra.");
        }

        // Obtener datos del SUPER_ADMIN
        var superAdmin = await _usuarioRepository.ObtenerPorIdAsync(superAdminId);
        if (superAdmin == null || !superAdmin.EsSuperAdmin)
        {
            throw new UnauthorizedAccessException("Solo SUPER_ADMIN puede iniciar sesiones de impersonación.");
        }

        // Obtener datos del tenant
        var tenant = await _tenantRepository.GetByIdAsync(request.TargetTenantId);
        if (tenant == null)
        {
            throw new ArgumentException("El tenant especificado no existe.");
        }

        // Crear sesión
        var sessionId = Guid.NewGuid();
        var expiresAt = DateTime.UtcNow.AddMinutes(DefaultSessionMinutes);

        var session = new ImpersonationSession
        {
            Id = sessionId,
            SuperAdminId = superAdminId,
            SuperAdminEmail = superAdmin.Email,
            SuperAdminName = superAdmin.Nombre,
            TargetTenantId = request.TargetTenantId,
            TargetTenantName = tenant.NombreEmpresa,
            Reason = request.Reason,
            TicketNumber = request.TicketNumber,
            AccessLevel = request.AccessLevel ?? ImpersonationAccessLevel.ReadOnly,
            StartedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            Status = ImpersonationStatus.Active,
            ActionsPerformed = "[]",
            PagesVisited = "[]"
        };

        await _repository.CreateSessionAsync(session);

        // Generar token de impersonación
        var impersonationToken = _tokenGenerator.GenerateImpersonationToken(
            superAdminId.ToString(),
            request.TargetTenantId,
            sessionId,
            session.AccessLevel,
            DefaultSessionMinutes
        );

        _logger.LogWarning(
            "IMPERSONATION_STARTED: SuperAdmin {SuperAdminId} ({SuperAdminEmail}) started impersonating Tenant {TenantId} ({TenantName}). Reason: {Reason}. Session: {SessionId}",
            superAdminId, superAdmin.Email, request.TargetTenantId, tenant.NombreEmpresa, request.Reason, sessionId);

        return new StartImpersonationResponse
        {
            SessionId = sessionId,
            ImpersonationToken = impersonationToken,
            TenantName = tenant.NombreEmpresa,
            AccessLevel = session.AccessLevel,
            ExpiresAt = expiresAt
        };
    }

    public async Task EndSessionAsync(
        Guid sessionId,
        int superAdminId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetByIdAsync(sessionId);
        if (session == null)
        {
            throw new ArgumentException("Sesión no encontrada.");
        }

        if (session.SuperAdminId != superAdminId)
        {
            throw new UnauthorizedAccessException("No tienes permiso para finalizar esta sesión.");
        }

        if (session.Status != ImpersonationStatus.Active)
        {
            throw new InvalidOperationException("La sesión ya fue finalizada.");
        }

        await _repository.EndSessionAsync(sessionId, DateTime.UtcNow);

        _logger.LogWarning(
            "IMPERSONATION_ENDED: SuperAdmin {SuperAdminId} ended impersonation of Tenant {TenantId}. Session: {SessionId}. Duration: {Duration}",
            superAdminId, session.TargetTenantId, sessionId, DateTime.UtcNow - session.StartedAt);

        // Enviar notificación al tenant (async, no bloquear)
        _ = Task.Run(() => SendNotificationAsync(sessionId, cancellationToken));
    }

    public async Task LogActionAsync(
        LogImpersonationActionRequest request,
        CancellationToken cancellationToken = default)
    {
        var actionLog = new
        {
            Type = request.ActionType,
            Description = request.Description,
            Path = request.Path,
            Timestamp = DateTime.UtcNow
        };

        await _repository.LogActionAsync(request.SessionId, JsonSerializer.Serialize(actionLog));

        if (!string.IsNullOrEmpty(request.Path))
        {
            await _repository.LogPageVisitAsync(request.SessionId, request.Path);
        }
    }

    public async Task<CurrentImpersonationState> GetCurrentStateAsync(
        int superAdminId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetActiveSessionForUserAsync(superAdminId);

        if (session == null || session.Status != ImpersonationStatus.Active)
        {
            return new CurrentImpersonationState { IsImpersonating = false };
        }

        // Verificar si expiró
        if (DateTime.UtcNow > session.ExpiresAt)
        {
            await _repository.EndSessionAsync(session.Id, DateTime.UtcNow);
            return new CurrentImpersonationState { IsImpersonating = false };
        }

        var minutesRemaining = (int)(session.ExpiresAt - DateTime.UtcNow).TotalMinutes;

        return new CurrentImpersonationState
        {
            IsImpersonating = true,
            SessionId = session.Id,
            Tenant = new ImpersonatedTenantInfo
            {
                Id = session.TargetTenantId,
                Name = session.TargetTenantName
            },
            MinutesRemaining = minutesRemaining,
            AccessLevel = session.AccessLevel
        };
    }

    public async Task<bool> ValidateSessionAsync(
        Guid sessionId,
        int superAdminId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetByIdAsync(sessionId);
        if (session == null) return false;
        if (session.SuperAdminId != superAdminId) return false;
        if (session.Status != ImpersonationStatus.Active) return false;
        if (DateTime.UtcNow > session.ExpiresAt) return false;
        return true;
    }

    public async Task<ImpersonationHistoryResponse> GetHistoryAsync(
        ImpersonationHistoryFilter filter,
        CancellationToken cancellationToken = default)
    {
        var (sessions, totalCount) = await _repository.GetHistoryAsync(
            filter.SuperAdminId,
            filter.TargetTenantId,
            filter.FromDate,
            filter.ToDate,
            filter.Status,
            filter.Page,
            filter.PageSize
        );

        var dtos = sessions.Select(s => MapToDto(s)).ToList();

        return new ImpersonationHistoryResponse
        {
            Sessions = dtos,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize,
            TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
        };
    }

    public async Task<ImpersonationSessionDto?> GetSessionDetailsAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetByIdAsync(sessionId);
        return session == null ? null : MapToDto(session);
    }

    public async Task ExpireOldSessionsAsync(CancellationToken cancellationToken = default)
    {
        await _repository.ExpireOldSessionsAsync();
        _logger.LogInformation("Expired old impersonation sessions.");
    }

    public async Task SendNotificationAsync(
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetByIdAsync(sessionId);
        if (session == null || session.NotificationSent) return;

        try
        {
            // TODO: Implementar envío real de email
            // Por ahora solo logueamos
            _logger.LogInformation(
                "NOTIFICATION: Tenant {TenantId} should be notified about impersonation session {SessionId}",
                session.TargetTenantId, sessionId);

            await _repository.MarkNotificationSentAsync(sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send impersonation notification for session {SessionId}", sessionId);
        }
    }

    private static ImpersonationSessionDto MapToDto(ImpersonationSession session)
    {
        var actionsCount = 0;
        var pagesCount = 0;

        try
        {
            var actions = JsonSerializer.Deserialize<List<object>>(session.ActionsPerformed ?? "[]");
            actionsCount = actions?.Count ?? 0;
        }
        catch { }

        try
        {
            var pages = JsonSerializer.Deserialize<List<string>>(session.PagesVisited ?? "[]");
            pagesCount = pages?.Count ?? 0;
        }
        catch { }

        var duration = (session.EndedAt ?? DateTime.UtcNow) - session.StartedAt;
        var durationFormatted = duration.TotalMinutes < 60
            ? $"{(int)duration.TotalMinutes} min"
            : $"{(int)duration.TotalHours}h {duration.Minutes}m";

        return new ImpersonationSessionDto
        {
            Id = session.Id,
            SuperAdminId = session.SuperAdminId,
            SuperAdminEmail = session.SuperAdminEmail,
            SuperAdminName = session.SuperAdminName,
            TargetTenantId = session.TargetTenantId,
            TargetTenantName = session.TargetTenantName,
            Reason = session.Reason,
            TicketNumber = session.TicketNumber,
            AccessLevel = session.AccessLevel,
            StartedAt = session.StartedAt,
            EndedAt = session.EndedAt,
            ExpiresAt = session.ExpiresAt,
            Status = session.Status,
            ActionsCount = actionsCount,
            PagesVisitedCount = pagesCount,
            DurationFormatted = durationFormatted
        };
    }
}
