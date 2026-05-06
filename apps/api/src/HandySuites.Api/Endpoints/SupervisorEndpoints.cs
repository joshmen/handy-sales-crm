using HandySuites.Application.Common.Interfaces;
using HandySuites.Application.DeviceSessions.Interfaces;
using HandySuites.Application.Usuarios.DTOs;
using HandySuites.Application.Usuarios.Interfaces;
using HandySuites.Domain.Common;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Api.Endpoints;

public static class SupervisorEndpoints
{
    public static void MapSupervisorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/supervisores")
            .RequireAuthorization()
            .WithTags("Supervisores")
            .WithOpenApi();

        // GET /api/supervisores/mis-vendedores
        group.MapGet("/mis-vendedores", async (
            ICurrentTenant tenant,
            HandySuitesDbContext db,
            [FromServices] IDeviceSessionRepository sessionRepo) =>
        {
            if (!tenant.IsSupervisor)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);

            var vendedores = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.SupervisorId == supervisorId
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .Select(u => new
                {
                    u.Id,
                    u.Nombre,
                    u.Email,
                    Rol = u.RolExplicito ?? RoleNames.Vendedor,
                    u.Activo,
                    u.AvatarUrl
                })
                .ToListAsync();

            // Enrich with online/offline status
            var presencia = await sessionRepo.ObtenerPresenciaActivaAsync(tenant.TenantId);
            var result = vendedores.Select(v =>
            {
                var hasSession = presencia.TryGetValue(v.Id, out var stats);
                return new
                {
                    v.Id, v.Nombre, v.Email, v.Rol, v.Activo, v.AvatarUrl,
                    IsOnline = hasSession && stats.LastActivity > DateTime.UtcNow.AddMinutes(-PresenceConstants.OnlineThresholdMinutes),
                    LastActivity = hasSession ? (DateTime?)stats.LastActivity : null,
                    ActiveDeviceCount = hasSession ? stats.Count : 0
                };
            });

            return Results.Ok(result);
        })
        .WithSummary("Mis vendedores")
        .WithDescription("Obtiene los vendedores asignados al supervisor autenticado.");

        // GET /api/supervisores/{id}/vendedores (admin only)
        group.MapGet("/{id:int}/vendedores", async (
            int id,
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsAdmin)
                return Results.Forbid();

            var vendedores = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.SupervisorId == id
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .Select(u => new
                {
                    u.Id,
                    u.Nombre,
                    u.Email,
                    Rol = u.RolExplicito ?? RoleNames.Vendedor,
                    u.Activo,
                    u.AvatarUrl
                })
                .ToListAsync();

            return Results.Ok(vendedores);
        })
        .WithSummary("Vendedores de un supervisor")
        .WithDescription("Obtiene los vendedores asignados a un supervisor específico (solo admin).");

        // POST /api/supervisores/{id}/asignar
        group.MapPost("/{id:int}/asignar", async (
            int id,
            [FromBody] AsignarVendedoresRequest request,
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsAdmin)
                return Results.Forbid();

            // Verify supervisor exists and belongs to tenant
            var supervisor = await db.Usuarios
                .FirstOrDefaultAsync(u => u.Id == id
                    && u.TenantId == tenant.TenantId
                    && u.EliminadoEn == null);

            if (supervisor == null)
                return Results.NotFound(new { message = "Supervisor no encontrado" });

            // Assign vendedores
            var vendedores = await db.Usuarios
                .Where(u => request.VendedorIds.Contains(u.Id)
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .ToListAsync();

            foreach (var v in vendedores)
            {
                v.SupervisorId = id;
            }

            await db.SaveChangesAsync();

            return Results.Ok(new { message = $"{vendedores.Count} vendedor(es) asignados", asignados = vendedores.Count });
        })
        .WithSummary("Asignar vendedores a supervisor")
        .WithDescription("Asigna uno o más vendedores a un supervisor (solo admin).");

        // DELETE /api/supervisores/{id}/vendedores/{vendedorId}
        group.MapDelete("/{id:int}/vendedores/{vendedorId:int}", async (
            int id,
            int vendedorId,
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsAdmin)
                return Results.Forbid();

            var vendedor = await db.Usuarios
                .FirstOrDefaultAsync(u => u.Id == vendedorId
                    && u.SupervisorId == id
                    && u.TenantId == tenant.TenantId
                    && u.EliminadoEn == null);

            if (vendedor == null)
                return Results.NotFound(new { message = "Vendedor no encontrado o no asignado a este supervisor" });

            vendedor.SupervisorId = null;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Vendedor desasignado" });
        })
        .WithSummary("Desasignar vendedor")
        .WithDescription("Desasigna un vendedor de un supervisor (solo admin).");

        // GET /api/supervisores/dashboard
        group.MapGet("/dashboard", async (
            ICurrentTenant tenant,
            ITenantTimeZoneService tenantTzSvc,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsSupervisor)
                return Results.Forbid();

            var supervisorId = int.Parse(tenant.UserId);
            // Ventanas en TZ tenant — antes "hoy" y "mes" usaban UTC del servidor.
            var hoyTenant = await tenantTzSvc.GetTenantTodayAsync();
            var (hoyStartUtc, hoyEndUtc) = await tenantTzSvc.GetTenantDayWindowUtcAsync(hoyTenant);
            var mesStart = new DateOnly(hoyTenant.Year, hoyTenant.Month, 1);
            var mesEnd = mesStart.AddMonths(1);
            var mesStartUtc = await tenantTzSvc.ConvertTenantDateToUtcAsync(mesStart);
            var mesEndUtc = await tenantTzSvc.ConvertTenantDateToUtcAsync(mesEnd);

            var subordinadoIds = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.SupervisorId == supervisorId
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null)
                .Select(u => u.Id)
                .ToListAsync();

            var allIds = new List<int>(subordinadoIds) { supervisorId };

            var pedidosHoy = await db.Pedidos
                .AsNoTracking()
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= hoyStartUtc && p.FechaPedido < hoyEndUtc
                         && p.Activo)
                .CountAsync();

            var pedidosMes = await db.Pedidos
                .AsNoTracking()
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= mesStartUtc && p.FechaPedido < mesEndUtc
                         && p.Activo)
                .CountAsync();

            var totalClientes = await db.Clientes
                .AsNoTracking()
                .Where(c => c.VendedorId.HasValue
                         && allIds.Contains(c.VendedorId.Value)
                         && c.TenantId == tenant.TenantId
                         && c.EliminadoEn == null)
                .CountAsync();

            var ventasMes = await db.Pedidos
                .AsNoTracking()
                .Where(p => allIds.Contains(p.UsuarioId)
                         && p.TenantId == tenant.TenantId
                         && p.FechaPedido >= mesStartUtc && p.FechaPedido < mesEndUtc
                         && p.Activo)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            return Results.Ok(new
            {
                totalVendedores = subordinadoIds.Count,
                pedidosHoy,
                pedidosMes,
                totalClientes,
                ventasMes
            });
        })
        .WithSummary("Dashboard supervisor")
        .WithDescription("KPIs del equipo del supervisor autenticado.");

        // GET /api/supervisores/vendedores-disponibles (admin: vendedores sin supervisor)
        group.MapGet("/vendedores-disponibles", async (
            ICurrentTenant tenant,
            HandySuitesDbContext db) =>
        {
            if (!tenant.IsAdmin)
                return Results.Forbid();

            var vendedores = await db.Usuarios
                .AsNoTracking()
                .Where(u => u.SupervisorId == null
                         && u.TenantId == tenant.TenantId
                         && u.EliminadoEn == null
                         && u.RolExplicito != RoleNames.SuperAdmin
                         && u.Activo)
                .Select(u => new
                {
                    u.Id,
                    u.Nombre,
                    u.Email,
                    Rol = u.RolExplicito ?? RoleNames.Vendedor,
                    u.AvatarUrl
                })
                .ToListAsync();

            return Results.Ok(vendedores);
        })
        .WithSummary("Vendedores disponibles")
        .WithDescription("Lista vendedores sin supervisor asignado (solo admin).");
    }
}

public record AsignarVendedoresRequest(List<int> VendedorIds);
