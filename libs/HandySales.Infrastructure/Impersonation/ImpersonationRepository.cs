using System.Text.Json;
using HandySales.Application.Impersonation.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Impersonation;

/// <summary>
/// Repositorio para sesiones de impersonación.
/// Implementa inmutabilidad de registros de auditoría.
/// </summary>
public class ImpersonationRepository : IImpersonationRepository
{
    private readonly HandySalesDbContext _context;

    public ImpersonationRepository(HandySalesDbContext context)
    {
        _context = context;
    }

    public async Task<ImpersonationSession> CreateSessionAsync(ImpersonationSession session)
    {
        _context.ImpersonationSessions.Add(session);
        await _context.SaveChangesAsync();
        return session;
    }

    public async Task<ImpersonationSession?> GetByIdAsync(Guid sessionId)
    {
        return await _context.ImpersonationSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId);
    }

    public async Task<ImpersonationSession?> GetActiveSessionForUserAsync(int superAdminId)
    {
        return await _context.ImpersonationSessions
            .AsNoTracking()
            .Where(s => s.SuperAdminId == superAdminId && s.Status == ImpersonationStatus.Active)
            .FirstOrDefaultAsync();
    }

    public async Task EndSessionAsync(Guid sessionId, DateTime endedAt)
    {
        await _context.ImpersonationSessions
            .Where(s => s.Id == sessionId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.Status, ImpersonationStatus.Ended)
                .SetProperty(s => s.EndedAt, endedAt));
    }

    public async Task ExpireOldSessionsAsync()
    {
        var now = DateTime.UtcNow;
        await _context.ImpersonationSessions
            .Where(s => s.Status == ImpersonationStatus.Active && s.ExpiresAt < now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.Status, ImpersonationStatus.Expired)
                .SetProperty(s => s.EndedAt, now));
    }

    public async Task LogActionAsync(Guid sessionId, string actionJson)
    {
        var session = await _context.ImpersonationSessions.FindAsync(sessionId);
        if (session == null) return;

        try
        {
            var actions = JsonSerializer.Deserialize<List<object>>(session.ActionsPerformed ?? "[]") ?? new List<object>();
            var newAction = JsonSerializer.Deserialize<object>(actionJson);
            if (newAction != null) actions.Add(newAction);
            session.ActionsPerformed = JsonSerializer.Serialize(actions);
            await _context.SaveChangesAsync();
        }
        catch
        {
            // Silently fail logging - don't interrupt user flow
        }
    }

    public async Task LogPageVisitAsync(Guid sessionId, string path)
    {
        var session = await _context.ImpersonationSessions.FindAsync(sessionId);
        if (session == null) return;

        try
        {
            var pages = JsonSerializer.Deserialize<List<string>>(session.PagesVisited ?? "[]") ?? new List<string>();
            if (!pages.Contains(path))
            {
                pages.Add(path);
                session.PagesVisited = JsonSerializer.Serialize(pages);
                await _context.SaveChangesAsync();
            }
        }
        catch
        {
            // Silently fail logging - don't interrupt user flow
        }
    }

    public async Task MarkNotificationSentAsync(Guid sessionId)
    {
        await _context.ImpersonationSessions
            .Where(s => s.Id == sessionId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.NotificationSent, true)
                .SetProperty(s => s.NotificationSentAt, DateTime.UtcNow));
    }

    public async Task<(List<ImpersonationSession> Sessions, int TotalCount)> GetHistoryAsync(
        int? superAdminId,
        int? targetTenantId,
        DateTime? fromDate,
        DateTime? toDate,
        string? status,
        int page,
        int pageSize)
    {
        var query = _context.ImpersonationSessions.AsNoTracking();

        if (superAdminId.HasValue)
            query = query.Where(s => s.SuperAdminId == superAdminId.Value);

        if (targetTenantId.HasValue)
            query = query.Where(s => s.TargetTenantId == targetTenantId.Value);

        if (fromDate.HasValue)
            query = query.Where(s => s.StartedAt >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(s => s.StartedAt <= toDate.Value);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(s => s.Status == status);

        var totalCount = await query.CountAsync();

        var sessions = await query
            .OrderByDescending(s => s.StartedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (sessions, totalCount);
    }

    public async Task<int> CountActiveSessionsForTenantAsync(int tenantId)
    {
        return await _context.ImpersonationSessions
            .CountAsync(s => s.TargetTenantId == tenantId && s.Status == ImpersonationStatus.Active);
    }
}
