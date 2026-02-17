using System.Text.Json;
using HandySales.Application.Notifications.DTOs;
using HandySales.Application.Notifications.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Notifications.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly HandySalesDbContext _db;

    public NotificationRepository(HandySalesDbContext db)
    {
        _db = db;
    }

    public async Task<NotificationHistory> CrearAsync(NotificationHistory notification)
    {
        _db.NotificationHistory.Add(notification);
        await _db.SaveChangesAsync();
        return notification;
    }

    public async Task<bool> ActualizarEstadoAsync(int id, NotificationStatus status, string? fcmMessageId = null, string? errorMessage = null)
    {
        var notification = await _db.NotificationHistory.FindAsync(id);
        if (notification == null) return false;

        notification.Status = status;
        notification.FcmMessageId = fcmMessageId;
        notification.ErrorMessage = errorMessage;

        if (status == NotificationStatus.Sent)
        {
            notification.EnviadoEn = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<NotificationPaginatedResult> ObtenerPorUsuarioAsync(int usuarioId, int tenantId, NotificationFiltroDto filtro)
    {
        var query = _db.NotificationHistory
            .Where(n => n.TenantId == tenantId && n.UsuarioId == usuarioId);

        // Filtrar por tipo
        if (!string.IsNullOrEmpty(filtro.Tipo))
        {
            if (Enum.TryParse<NotificationType>(filtro.Tipo, true, out var tipo))
            {
                query = query.Where(n => n.Tipo == tipo);
            }
        }

        // Filtrar por no leídas
        if (filtro.NoLeidas.HasValue && filtro.NoLeidas.Value)
        {
            query = query.Where(n => n.LeidoEn == null);
        }

        // Filtrar por fecha
        if (filtro.Desde.HasValue)
        {
            query = query.Where(n => n.CreadoEn >= filtro.Desde.Value);
        }

        if (filtro.Hasta.HasValue)
        {
            query = query.Where(n => n.CreadoEn <= filtro.Hasta.Value);
        }

        var totalItems = await query.CountAsync();
        var noLeidas = await query.CountAsync(n => n.LeidoEn == null);

        var rawItems = await query
            .OrderByDescending(n => n.CreadoEn)
            .Skip((filtro.Pagina - 1) * filtro.TamanoPagina)
            .Take(filtro.TamanoPagina)
            .Select(n => new
            {
                n.Id,
                n.Titulo,
                n.Mensaje,
                Tipo = n.Tipo.ToString(),
                Status = n.Status.ToString(),
                n.DataJson,
                n.EnviadoEn,
                n.LeidoEn,
                n.CreadoEn
            })
            .ToListAsync();

        var items = rawItems.Select(n => new NotificationDto
        {
            Id = n.Id,
            Titulo = n.Titulo,
            Mensaje = n.Mensaje,
            Tipo = n.Tipo,
            Status = n.Status,
            Data = !string.IsNullOrEmpty(n.DataJson) ? JsonSerializer.Deserialize<Dictionary<string, string>>(n.DataJson) : null,
            EnviadoEn = n.EnviadoEn,
            LeidoEn = n.LeidoEn,
            CreadoEn = n.CreadoEn
        }).ToList();

        return new NotificationPaginatedResult
        {
            Items = items,
            TotalItems = totalItems,
            NoLeidas = noLeidas,
            Pagina = filtro.Pagina,
            TamanoPagina = filtro.TamanoPagina
        };
    }

    public async Task<bool> MarcarComoLeidaAsync(int id, int usuarioId, int tenantId)
    {
        var notification = await _db.NotificationHistory
            .FirstOrDefaultAsync(n => n.Id == id && n.UsuarioId == usuarioId && n.TenantId == tenantId);

        if (notification == null) return false;

        notification.LeidoEn = DateTime.UtcNow;
        notification.Status = NotificationStatus.Read;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> MarcarTodasComoLeidasAsync(int usuarioId, int tenantId)
    {
        var ahora = DateTime.UtcNow;
        var count = await _db.NotificationHistory
            .Where(n => n.TenantId == tenantId && n.UsuarioId == usuarioId && n.LeidoEn == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(n => n.LeidoEn, ahora)
                .SetProperty(n => n.Status, NotificationStatus.Read));

        return count;
    }

    public async Task<int> ObtenerConteoNoLeidasAsync(int usuarioId, int tenantId)
    {
        return await _db.NotificationHistory
            .CountAsync(n => n.TenantId == tenantId && n.UsuarioId == usuarioId && n.LeidoEn == null);
    }

    public async Task<bool> EliminarAsync(int id, int usuarioId, int tenantId)
    {
        var notification = await _db.NotificationHistory
            .FirstOrDefaultAsync(n => n.Id == id && n.UsuarioId == usuarioId && n.TenantId == tenantId);

        if (notification == null) return false;

        _db.NotificationHistory.Remove(notification);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<(int UsuarioId, int SessionId, string PushToken)>> ObtenerPushTokensAsync(int tenantId, List<int>? usuarioIds = null)
    {
        var query = _db.DeviceSessions
            .Where(d => d.TenantId == tenantId
                && d.Status == SessionStatus.Active
                && !string.IsNullOrEmpty(d.PushToken));

        if (usuarioIds != null && usuarioIds.Any())
        {
            query = query.Where(d => usuarioIds.Contains(d.UsuarioId));
        }

        var results = await query
            .Select(d => new { d.UsuarioId, d.Id, d.PushToken })
            .ToListAsync();

        return results.Select(x => (x.UsuarioId, x.Id, x.PushToken!)).ToList();
    }

    public async Task<List<(int UsuarioId, int SessionId, string PushToken)>> ObtenerPushTokensVendedoresPorZonaAsync(int tenantId, int? zonaId)
    {
        var query = from d in _db.DeviceSessions
                    join u in _db.Usuarios on d.UsuarioId equals u.Id
                    where d.TenantId == tenantId
                        && d.Status == SessionStatus.Active
                        && !string.IsNullOrEmpty(d.PushToken)
                        && !u.EsAdmin
                        && !u.EsSuperAdmin
                    select new { d.UsuarioId, SessionId = d.Id, d.PushToken };

        // Filtrar por zona requeriría tener la relación Usuario-Zona
        // Por ahora, retornamos todos los vendedores

        var results = await query.ToListAsync();
        return results.Select(x => (x.UsuarioId, x.SessionId, x.PushToken!)).ToList();
    }
}
