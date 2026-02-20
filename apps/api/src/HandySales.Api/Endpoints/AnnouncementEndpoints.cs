using System.Text.Json;
using HandySales.Api.Hubs;
using HandySales.Api.Middleware;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HandySales.Api.Endpoints;

public static class AnnouncementEndpoints
{
    public static void MapAnnouncementEndpoints(this IEndpointRouteBuilder app)
    {
        // ═══════════════════════════════════════
        // SuperAdmin CRUD endpoints
        // ═══════════════════════════════════════
        var superadmin = app.MapGroup("/api/superadmin/announcements")
            .RequireAuthorization()
            .WithTags("Announcements (SuperAdmin)");

        // GET all announcements (with stats)
        superadmin.MapGet("/", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ICurrentTenant tenant,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20) =>
        {
            if (!tenant.IsSuperAdmin)
                return Results.Forbid();

            var query = db.Announcements
                .AsNoTracking()
                .OrderByDescending(a => a.CreadoEn);

            var total = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.Titulo,
                    a.Mensaje,
                    Tipo = a.Tipo.ToString(),
                    Prioridad = a.Prioridad.ToString(),
                    DisplayMode = a.DisplayMode.ToString(),
                    a.TargetTenantIds,
                    a.TargetRoles,
                    a.ScheduledAt,
                    a.ExpiresAt,
                    a.IsDismissible,
                    a.SuperAdminId,
                    a.SentCount,
                    a.ReadCount,
                    a.Activo,
                    a.CreadoEn,
                })
                .ToListAsync();

            return Results.Ok(new { items, total, page, pageSize });
        });

        // GET single announcement with detailed stats
        superadmin.MapGet("/{id:int}", async (
            int id,
            [FromServices] HandySalesDbContext db,
            [FromServices] ICurrentTenant tenant) =>
        {
            if (!tenant.IsSuperAdmin)
                return Results.Forbid();

            var announcement = await db.Announcements
                .AsNoTracking()
                .Include(a => a.Dismissals)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (announcement == null)
                return Results.NotFound();

            return Results.Ok(new
            {
                announcement.Id,
                announcement.Titulo,
                announcement.Mensaje,
                Tipo = announcement.Tipo.ToString(),
                Prioridad = announcement.Prioridad.ToString(),
                DisplayMode = announcement.DisplayMode.ToString(),
                announcement.TargetTenantIds,
                announcement.TargetRoles,
                announcement.ScheduledAt,
                announcement.ExpiresAt,
                announcement.IsDismissible,
                announcement.SuperAdminId,
                announcement.SentCount,
                announcement.ReadCount,
                announcement.Activo,
                announcement.CreadoEn,
                DismissedCount = announcement.Dismissals.Count,
            });
        });

        // POST create announcement
        superadmin.MapPost("/", async (
            [FromBody] CreateAnnouncementDto dto,
            [FromServices] HandySalesDbContext db,
            [FromServices] ICurrentTenant tenant,
            [FromServices] IMemoryCache cache,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (!tenant.IsSuperAdmin)
                return Results.Forbid();

            if (string.IsNullOrWhiteSpace(dto.Titulo) || string.IsNullOrWhiteSpace(dto.Mensaje))
                return Results.BadRequest(new { error = "Título y mensaje son requeridos" });

            if (dto.Titulo.Length > 150)
                return Results.BadRequest(new { error = "El título no puede exceder 150 caracteres" });

            if (dto.Mensaje.Length > 500)
                return Results.BadRequest(new { error = "El mensaje no puede exceder 500 caracteres" });

            if (!Enum.TryParse<AnnouncementType>(dto.Tipo, true, out var tipo))
                return Results.BadRequest(new { error = "Tipo inválido. Valores: Broadcast, Maintenance, Banner" });

            if (!Enum.TryParse<AnnouncementPriority>(dto.Prioridad, true, out var prioridad))
                prioridad = AnnouncementPriority.Normal;

            // Parse DisplayMode (default: Banner). Maintenance always forced to Banner.
            if (!Enum.TryParse<AnnouncementDisplayMode>(dto.DisplayMode, true, out var displayMode))
                displayMode = AnnouncementDisplayMode.Banner;
            if (tipo == AnnouncementType.Maintenance)
                displayMode = AnnouncementDisplayMode.Banner;

            var announcement = new Announcement
            {
                Titulo = dto.Titulo,
                Mensaje = dto.Mensaje,
                Tipo = tipo,
                Prioridad = prioridad,
                DisplayMode = displayMode,
                TargetTenantIds = dto.TargetTenantIds != null ? JsonSerializer.Serialize(dto.TargetTenantIds) : null,
                TargetRoles = dto.TargetRoles != null ? JsonSerializer.Serialize(dto.TargetRoles) : null,
                ScheduledAt = dto.ScheduledAt,
                ExpiresAt = dto.ExpiresAt,
                IsDismissible = dto.IsDismissible,
                SuperAdminId = int.Parse(tenant.UserId),
                CreadoPor = tenant.UserId,
            };

            // For Maintenance type, also toggle GlobalSettings.MaintenanceMode
            if (tipo == AnnouncementType.Maintenance)
            {
                var settings = await db.GlobalSettings.FirstOrDefaultAsync();
                if (settings != null)
                {
                    settings.MaintenanceMode = true;
                    settings.MaintenanceMessage = dto.Mensaje;
                    settings.UpdatedAt = DateTime.UtcNow;
                    settings.UpdatedBy = tenant.UserId;
                }
                cache.Remove(MaintenanceMiddleware.CacheKey);
            }

            db.Announcements.Add(announcement);
            await db.SaveChangesAsync();

            // If DisplayMode includes Notification, create NotificationHistory for target users
            if (displayMode == AnnouncementDisplayMode.Notification || displayMode == AnnouncementDisplayMode.Both)
            {
                var targetUserQuery = db.Usuarios.IgnoreQueryFilters().AsNoTracking().Where(u => u.Activo);

                // Filter by target tenants
                if (dto.TargetTenantIds is { Count: > 0 })
                    targetUserQuery = targetUserQuery.Where(u => dto.TargetTenantIds.Contains(u.TenantId));

                // Filter by target roles (Role.Nombre matches role names like "Admin", "Vendedor", etc.)
                if (dto.TargetRoles is { Count: > 0 })
                    targetUserQuery = targetUserQuery.Where(u => u.Role != null && dto.TargetRoles.Contains(u.Role.Nombre));

                var targetUsers = await targetUserQuery
                    .Select(u => new { u.Id, u.TenantId })
                    .ToListAsync();

                foreach (var user in targetUsers)
                {
                    db.NotificationHistory.Add(new NotificationHistory
                    {
                        TenantId = user.TenantId,
                        UsuarioId = user.Id,
                        Titulo = announcement.Titulo,
                        Mensaje = announcement.Mensaje,
                        Tipo = NotificationType.System,
                        Status = NotificationStatus.Delivered,
                        EnviadoEn = DateTime.UtcNow,
                        DataJson = JsonSerializer.Serialize(new Dictionary<string, string> { ["announcementId"] = announcement.Id.ToString() }),
                        CreadoPor = tenant.UserId,
                    });
                }

                if (targetUsers.Count > 0)
                {
                    announcement.SentCount = targetUsers.Count;
                    await db.SaveChangesAsync();
                }
            }

            // Push real-time event via SignalR
            var pushPayload = new
            {
                announcement.Id,
                announcement.Titulo,
                announcement.Mensaje,
                Tipo = announcement.Tipo.ToString(),
                Prioridad = announcement.Prioridad.ToString(),
                DisplayMode = announcement.DisplayMode.ToString(),
                announcement.IsDismissible,
                announcement.ExpiresAt,
            };

            if (tipo == AnnouncementType.Maintenance)
            {
                // Maintenance: broadcast to ALL connected clients
                await hubContext.Clients.All.SendAsync("MaintenanceModeChanged", new { active = true, message = announcement.Mensaje });
                await hubContext.Clients.All.SendAsync("AnnouncementCreated", pushPayload);
            }
            else if (dto.TargetTenantIds is { Count: > 0 })
            {
                // Targeted: send to specific tenant groups
                foreach (var tid in dto.TargetTenantIds)
                {
                    await hubContext.Clients.Group($"tenant:{tid}").SendAsync("AnnouncementCreated", pushPayload);
                }
            }
            else
            {
                // No targeting: broadcast to all
                await hubContext.Clients.All.SendAsync("AnnouncementCreated", pushPayload);
            }

            // Push ReceiveNotification for bell badge update (when DisplayMode includes Notification)
            if (displayMode == AnnouncementDisplayMode.Notification || displayMode == AnnouncementDisplayMode.Both)
            {
                var notifPayload = new
                {
                    id = 0, // client will refetch
                    titulo = announcement.Titulo,
                    mensaje = announcement.Mensaje,
                    tipo = "System",
                };

                if (dto.TargetTenantIds is { Count: > 0 })
                {
                    foreach (var tid in dto.TargetTenantIds)
                        await hubContext.Clients.Group($"tenant:{tid}").SendAsync("ReceiveNotification", notifPayload);
                }
                else
                {
                    await hubContext.Clients.All.SendAsync("ReceiveNotification", notifPayload);
                }
            }

            return Results.Created($"/api/superadmin/announcements/{announcement.Id}", new
            {
                announcement.Id,
                announcement.Titulo,
                Tipo = announcement.Tipo.ToString(),
                DisplayMode = announcement.DisplayMode.ToString(),
                announcement.CreadoEn,
            });
        });

        // DELETE (expire) announcement
        superadmin.MapDelete("/{id:int}", async (
            int id,
            [FromServices] HandySalesDbContext db,
            [FromServices] ICurrentTenant tenant,
            [FromServices] IMemoryCache cache,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (!tenant.IsSuperAdmin)
                return Results.Forbid();

            var announcement = await db.Announcements.FindAsync(id);
            if (announcement == null)
                return Results.NotFound();

            announcement.Activo = false;
            announcement.ExpiresAt = DateTime.UtcNow;
            announcement.ActualizadoEn = DateTime.UtcNow;
            announcement.ActualizadoPor = tenant.UserId;

            // If maintenance type, disable maintenance mode
            if (announcement.Tipo == AnnouncementType.Maintenance)
            {
                var settings = await db.GlobalSettings.FirstOrDefaultAsync();
                if (settings != null)
                {
                    settings.MaintenanceMode = false;
                    settings.MaintenanceMessage = null;
                    settings.UpdatedAt = DateTime.UtcNow;
                    settings.UpdatedBy = tenant.UserId;
                }
                cache.Remove(MaintenanceMiddleware.CacheKey);
            }

            await db.SaveChangesAsync();

            // Push real-time: announce expiry
            await hubContext.Clients.All.SendAsync("AnnouncementExpired", new { id });

            // If maintenance was deactivated, also push maintenance mode change
            if (announcement.Tipo == AnnouncementType.Maintenance)
            {
                await hubContext.Clients.All.SendAsync("MaintenanceModeChanged", new { active = false });
            }

            return Results.Ok(new { message = "Anuncio expirado" });
        });

        // ═══════════════════════════════════════
        // Maintenance mode shortcuts
        // ═══════════════════════════════════════
        var maintenance = app.MapGroup("/api/superadmin/maintenance")
            .RequireAuthorization()
            .WithTags("Maintenance (SuperAdmin)");

        // POST activate maintenance mode
        maintenance.MapPost("/", async (
            [FromBody] MaintenanceModeDto dto,
            [FromServices] HandySalesDbContext db,
            [FromServices] ICurrentTenant tenant,
            [FromServices] IMemoryCache cache,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (!tenant.IsSuperAdmin)
                return Results.Forbid();

            var settings = await db.GlobalSettings.FirstOrDefaultAsync();
            if (settings == null)
                return Results.NotFound(new { error = "GlobalSettings no encontrado" });

            settings.MaintenanceMode = true;
            settings.MaintenanceMessage = dto.Message ?? "Sistema en mantenimiento. Por favor espera.";
            settings.UpdatedAt = DateTime.UtcNow;
            settings.UpdatedBy = tenant.UserId;

            // Create maintenance announcement record
            var announcement = new Announcement
            {
                Titulo = "Modo Mantenimiento",
                Mensaje = settings.MaintenanceMessage,
                Tipo = AnnouncementType.Maintenance,
                Prioridad = AnnouncementPriority.Critical,
                IsDismissible = false,
                SuperAdminId = int.Parse(tenant.UserId),
                CreadoPor = tenant.UserId,
            };
            db.Announcements.Add(announcement);

            await db.SaveChangesAsync();
            cache.Remove(MaintenanceMiddleware.CacheKey);

            // Push real-time maintenance mode activation + announcement created
            await hubContext.Clients.All.SendAsync("MaintenanceModeChanged", new { active = true, message = settings.MaintenanceMessage });
            await hubContext.Clients.All.SendAsync("AnnouncementCreated", new
            {
                announcement.Id,
                announcement.Titulo,
                announcement.Mensaje,
                Tipo = announcement.Tipo.ToString(),
                Prioridad = announcement.Prioridad.ToString(),
                announcement.IsDismissible,
            });

            return Results.Ok(new { maintenance = true, message = settings.MaintenanceMessage });
        });

        // DELETE deactivate maintenance mode
        maintenance.MapDelete("/", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ICurrentTenant tenant,
            [FromServices] IMemoryCache cache,
            [FromServices] IHubContext<NotificationHub> hubContext) =>
        {
            if (!tenant.IsSuperAdmin)
                return Results.Forbid();

            var settings = await db.GlobalSettings.FirstOrDefaultAsync();
            if (settings == null)
                return Results.NotFound(new { error = "GlobalSettings no encontrado" });

            settings.MaintenanceMode = false;
            settings.MaintenanceMessage = null;
            settings.UpdatedAt = DateTime.UtcNow;
            settings.UpdatedBy = tenant.UserId;

            // Expire active maintenance announcements
            var activeMaintenances = await db.Announcements
                .Where(a => a.Tipo == AnnouncementType.Maintenance && a.Activo)
                .ToListAsync();

            foreach (var m in activeMaintenances)
            {
                m.Activo = false;
                m.ExpiresAt = DateTime.UtcNow;
                m.ActualizadoEn = DateTime.UtcNow;
                m.ActualizadoPor = tenant.UserId;
            }

            await db.SaveChangesAsync();
            cache.Remove(MaintenanceMiddleware.CacheKey);

            // Push real-time maintenance mode deactivation
            await hubContext.Clients.All.SendAsync("MaintenanceModeChanged", new { active = false });
            foreach (var m in activeMaintenances)
            {
                await hubContext.Clients.All.SendAsync("AnnouncementExpired", new { id = m.Id });
            }

            return Results.Ok(new { maintenance = false });
        });

        // ═══════════════════════════════════════
        // Client-facing banner endpoints (any authenticated user)
        // ═══════════════════════════════════════
        var banners = app.MapGroup("/api/notificaciones/banners")
            .RequireAuthorization()
            .WithTags("Banners");

        // GET active banners for current user
        banners.MapGet("/", async (
            [FromServices] HandySalesDbContext db,
            [FromServices] ICurrentTenant tenant) =>
        {
            var now = DateTime.UtcNow;
            var userId = int.Parse(tenant.UserId);
            var tenantId = tenant.TenantId;
            var userRole = tenant.IsSuperAdmin ? "SuperAdmin" : tenant.IsAdmin ? "Admin" : "Vendedor";

            // Get active, non-expired announcements that should show as banners
            var announcements = await db.Announcements
                .AsNoTracking()
                .Where(a => a.Activo
                    && (a.DisplayMode == AnnouncementDisplayMode.Banner || a.DisplayMode == AnnouncementDisplayMode.Both)
                    && (a.ExpiresAt == null || a.ExpiresAt > now)
                    && (a.ScheduledAt == null || a.ScheduledAt <= now))
                .OrderByDescending(a => a.Prioridad)
                .ThenByDescending(a => a.CreadoEn)
                .ToListAsync();

            // Get user's dismissed announcement IDs
            var dismissedIds = await db.AnnouncementDismissals
                .AsNoTracking()
                .Where(d => d.UsuarioId == userId)
                .Select(d => d.AnnouncementId)
                .ToListAsync();

            var filtered = announcements
                .Where(a =>
                {
                    // SuperAdmin should NOT see banners unless explicitly targeted to them
                    // (they are the ones who create them — they see them in /admin/announcements)
                    if (tenant.IsSuperAdmin)
                    {
                        if (string.IsNullOrEmpty(a.TargetRoles))
                            return false; // Not targeted to any role = meant for tenants, not SA
                        var saRoles = JsonSerializer.Deserialize<List<string>>(a.TargetRoles);
                        if (saRoles == null || !saRoles.Contains("SuperAdmin"))
                            return false; // Not explicitly targeted to SuperAdmin
                    }

                    // Skip dismissed (unless not dismissible)
                    if (a.IsDismissible && dismissedIds.Contains(a.Id))
                        return false;

                    // Check tenant targeting
                    if (!string.IsNullOrEmpty(a.TargetTenantIds))
                    {
                        var targetTenants = JsonSerializer.Deserialize<List<int>>(a.TargetTenantIds);
                        if (targetTenants != null && !targetTenants.Contains(tenantId))
                            return false;
                    }

                    // Check role targeting
                    if (!string.IsNullOrEmpty(a.TargetRoles))
                    {
                        var targetRoles = JsonSerializer.Deserialize<List<string>>(a.TargetRoles);
                        if (targetRoles != null && !targetRoles.Contains(userRole))
                            return false;
                    }

                    return true;
                })
                .Select(a => new
                {
                    a.Id,
                    a.Titulo,
                    a.Mensaje,
                    Tipo = a.Tipo.ToString(),
                    Prioridad = a.Prioridad.ToString(),
                    DisplayMode = a.DisplayMode.ToString(),
                    a.IsDismissible,
                    a.ExpiresAt,
                    a.DataJson,
                })
                .ToList();

            return Results.Ok(filtered);
        });

        // POST dismiss a banner
        banners.MapPost("/{id:int}/dismiss", async (
            int id,
            [FromServices] HandySalesDbContext db,
            [FromServices] ICurrentTenant tenant) =>
        {
            var userId = int.Parse(tenant.UserId);

            var announcement = await db.Announcements
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id && a.IsDismissible);

            if (announcement == null)
                return Results.NotFound();

            // Check if already dismissed
            var exists = await db.AnnouncementDismissals
                .AnyAsync(d => d.AnnouncementId == id && d.UsuarioId == userId);

            if (!exists)
            {
                db.AnnouncementDismissals.Add(new AnnouncementDismissal
                {
                    AnnouncementId = id,
                    UsuarioId = userId,
                });

                // Increment read count
                var ann = await db.Announcements.FindAsync(id);
                if (ann != null)
                    ann.ReadCount++;

                await db.SaveChangesAsync();
            }

            return Results.Ok(new { dismissed = true });
        });
    }
}

// DTOs
public record CreateAnnouncementDto(
    string Titulo,
    string Mensaje,
    string Tipo,
    string Prioridad = "Normal",
    string DisplayMode = "Banner",
    List<int>? TargetTenantIds = null,
    List<string>? TargetRoles = null,
    DateTime? ScheduledAt = null,
    DateTime? ExpiresAt = null,
    bool IsDismissible = true
);

public record MaintenanceModeDto(string? Message);
