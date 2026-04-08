using System.Security.Claims;
using System.Text.Json;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Mobile.Api.Endpoints;

public static class MobileAnnouncementEndpoints
{
    public static void MapMobileAnnouncementEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mobile/announcements")
            .RequireAuthorization()
            .WithTags("Anuncios");

        // GET /api/mobile/announcements — active announcements filtered by tenant/role
        group.MapGet("/", async (
            HandySuitesDbContext db,
            HttpContext context) =>
        {
            var userIdStr = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? context.User.FindFirst("sub")?.Value;
            var tenantIdStr = context.User.FindFirst("tenant_id")?.Value;
            var userRole = context.User.FindFirst(ClaimTypes.Role)?.Value
                        ?? context.User.FindFirst("role")?.Value ?? "Vendedor";

            if (!int.TryParse(userIdStr, out var userId) || !int.TryParse(tenantIdStr, out var tenantId))
                return Results.Unauthorized();

            var now = DateTime.UtcNow;

            // Get dismissed announcement IDs for this user
            var dismissedIds = await db.AnnouncementDismissals
                .AsNoTracking()
                .Where(d => d.UsuarioId == userId)
                .Select(d => d.AnnouncementId)
                .ToListAsync();

            var announcements = await db.Announcements
                .AsNoTracking()
                .Where(a => a.Activo
                    && (a.DisplayMode == AnnouncementDisplayMode.Banner || a.DisplayMode == AnnouncementDisplayMode.Both)
                    && (a.ScheduledAt == null || a.ScheduledAt <= now)
                    && (a.ExpiresAt == null || a.ExpiresAt > now))
                .OrderByDescending(a => a.Prioridad)
                .ThenByDescending(a => a.CreadoEn)
                .Take(50)
                .ToListAsync();

            // Filter by tenant targeting, role targeting, and dismissals
            var filtered = announcements.Where(a =>
            {
                // Exclude dismissed
                if (dismissedIds.Contains(a.Id)) return false;

                // Check tenant targeting
                if (!string.IsNullOrEmpty(a.TargetTenantIds))
                {
                    try
                    {
                        var targetTenants = JsonSerializer.Deserialize<List<int>>(a.TargetTenantIds);
                        if (targetTenants != null && targetTenants.Count > 0 && !targetTenants.Contains(tenantId))
                            return false;
                    }
                    catch { /* malformed JSON — skip filter */ }
                }

                // Check role targeting
                if (!string.IsNullOrEmpty(a.TargetRoles))
                {
                    try
                    {
                        var targetRoles = JsonSerializer.Deserialize<List<string>>(a.TargetRoles);
                        if (targetRoles != null && targetRoles.Count > 0 && !targetRoles.Contains(userRole))
                            return false;
                    }
                    catch { /* malformed JSON — skip filter */ }
                }

                return true;
            })
            .Take(20)
            .Select(a => new
            {
                a.Id,
                a.Titulo,
                a.Mensaje,
                Tipo = a.Tipo.ToString(),
                Prioridad = a.Prioridad.ToString(),
                a.IsDismissible,
                a.CreadoEn,
                a.ExpiresAt,
            })
            .ToList();

            return Results.Ok(new { data = filtered });
        })
        .WithSummary("Obtener anuncios activos filtrados por tenant y rol");

        // POST /api/mobile/announcements/{id}/dismiss — dismiss an announcement
        group.MapPost("/{id:int}/dismiss", async (
            int id,
            HandySuitesDbContext db,
            HttpContext context) =>
        {
            var userIdStr = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? context.User.FindFirst("sub")?.Value;
            if (!int.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            // Check if already dismissed
            var exists = await db.AnnouncementDismissals
                .AnyAsync(d => d.AnnouncementId == id && d.UsuarioId == userId);
            if (exists) return Results.Ok();

            db.AnnouncementDismissals.Add(new AnnouncementDismissal
            {
                AnnouncementId = id,
                UsuarioId = userId,
                DismissedAt = DateTime.UtcNow,
            });

            // Increment read count
            var announcement = await db.Announcements.FindAsync(id);
            if (announcement != null) announcement.ReadCount++;

            await db.SaveChangesAsync();
            return Results.Ok();
        })
        .WithSummary("Descartar un anuncio");
    }
}
