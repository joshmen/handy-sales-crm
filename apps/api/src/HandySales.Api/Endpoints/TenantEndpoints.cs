using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using BCrypt.Net;
using HandySales.Api.Hubs;
using HandySales.Application.Tenants.DTOs;
using HandySales.Shared.Email;
using HandySales.Application.Usuarios.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;

namespace HandySales.Api.Endpoints;

public static class TenantEndpoints
{
    public static void MapTenantEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tenants")
            .RequireAuthorization()
            .RequireCors("HandySalesPolicy");

        group.MapGet("/", GetAll)
            .WithName("GetAllTenants")
            .WithSummary("Lista todos los tenants (solo SuperAdmin)");

        group.MapGet("/{id:int}", GetById)
            .WithName("GetTenantById")
            .WithSummary("Obtiene detalle de un tenant con estadísticas");

        group.MapPost("/", Create)
            .WithName("CreateTenant")
            .WithSummary("Crea un nuevo tenant/empresa");

        group.MapPut("/{id:int}", Update)
            .WithName("UpdateTenant")
            .WithSummary("Actualiza datos de un tenant");

        group.MapPatch("/{id:int}/activo", ToggleActivo)
            .WithName("ToggleTenantActivo")
            .WithSummary("Activa o desactiva un tenant");

        group.MapPatch("/batch-toggle", BatchToggleActivo)
            .WithName("BatchToggleTenantActivo")
            .WithSummary("Activa o desactiva múltiples tenants");

        group.MapGet("/{id:int}/users", GetTenantUsers)
            .WithName("GetTenantUsers")
            .WithSummary("Lista usuarios de un tenant (solo SuperAdmin)");

        group.MapPost("/{id:int}/users", CreateTenantUser)
            .WithName("CreateTenantUser")
            .WithSummary("Crea un usuario en un tenant (solo SuperAdmin)");
    }

    private static async Task<IResult> GetAll(
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ITenantRepository tenantRepo,
        [FromServices] HandySalesDbContext context)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenants = await tenantRepo.GetAllAsync();

        var tenantIds = tenants.Select(t => t.Id).ToList();
        var userCounts = await context.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => tenantIds.Contains(u.TenantId) && u.Activo)
            .GroupBy(u => u.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TenantId, x => x.Count);

        var result = tenants.Select(t => new TenantListDto(
            t.Id,
            t.NombreEmpresa,
            t.RFC,
            t.Activo,
            t.PlanTipo,
            userCounts.GetValueOrDefault(t.Id, 0),
            t.FechaExpiracion,
            t.FechaExpiracion == null || t.FechaExpiracion > DateTime.UtcNow
        )).ToList();

        return Results.Ok(result);
    }

    private static async Task<IResult> GetById(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ITenantRepository tenantRepo,
        [FromServices] HandySalesDbContext context)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenant = await tenantRepo.GetByIdAsync(id);
        if (tenant == null)
            return Results.NotFound(new { message = "Tenant no encontrado" });

        var stats = new TenantStatsDto(
            await context.Usuarios.IgnoreQueryFilters().AsNoTracking().CountAsync(u => u.TenantId == id && u.Activo),
            await context.Clientes.IgnoreQueryFilters().AsNoTracking().CountAsync(c => c.TenantId == id),
            await context.Productos.IgnoreQueryFilters().AsNoTracking().CountAsync(p => p.TenantId == id),
            await context.Pedidos.IgnoreQueryFilters().AsNoTracking().CountAsync(p => p.TenantId == id)
        );

        var result = new TenantDetailDto(
            tenant.Id,
            tenant.NombreEmpresa,
            tenant.RFC,
            tenant.Contacto,
            tenant.Telefono,
            tenant.Email,
            tenant.Direccion,
            tenant.LogoUrl,
            tenant.CloudinaryFolder,
            tenant.Activo,
            tenant.PlanTipo,
            tenant.MaxUsuarios,
            tenant.FechaSuscripcion,
            tenant.FechaExpiracion,
            tenant.FechaExpiracion == null || tenant.FechaExpiracion > DateTime.UtcNow,
            tenant.CreadoEn,
            stats
        );

        return Results.Ok(result);
    }

    private static async Task<IResult> Create(
        [FromBody] TenantCreateDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ITenantRepository tenantRepo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenant = new Tenant
        {
            NombreEmpresa = dto.NombreEmpresa,
            RFC = dto.RFC,
            Contacto = dto.Contacto,
            Telefono = dto.Telefono,
            Email = dto.Email,
            Direccion = dto.Direccion,
            PlanTipo = dto.PlanTipo ?? "basic",
            MaxUsuarios = dto.MaxUsuarios > 0 ? dto.MaxUsuarios : 10,
            FechaSuscripcion = dto.FechaSuscripcion ?? DateTime.UtcNow,
            FechaExpiracion = dto.FechaExpiracion ?? DateTime.UtcNow.AddYears(1),
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = currentTenant.UserId
        };

        var created = await tenantRepo.CrearAsync(tenant);
        return Results.Created($"/api/tenants/{created.Id}", new { id = created.Id });
    }

    private static async Task<IResult> Update(
        int id,
        [FromBody] TenantUpdateDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ITenantRepository tenantRepo)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var existing = await tenantRepo.GetByIdAsync(id);
        if (existing == null)
            return Results.NotFound(new { message = "Tenant no encontrado" });

        var tenant = new Tenant
        {
            Id = id,
            NombreEmpresa = dto.NombreEmpresa,
            RFC = dto.RFC,
            Contacto = dto.Contacto,
            Telefono = dto.Telefono,
            Email = dto.Email,
            Direccion = dto.Direccion,
            LogoUrl = dto.LogoUrl,
            PlanTipo = dto.PlanTipo,
            MaxUsuarios = dto.MaxUsuarios,
            FechaSuscripcion = dto.FechaSuscripcion,
            FechaExpiracion = dto.FechaExpiracion
        };

        await tenantRepo.UpdateAsync(tenant);
        return Results.Ok(new { message = "Tenant actualizado" });
    }

    private static async Task<IResult> ToggleActivo(
        int id,
        [FromBody] TenantCambiarActivoDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ITenantRepository tenantRepo,
        [FromServices] HandySalesDbContext db,
        [FromServices] IMemoryCache cache,
        [FromServices] IHubContext<NotificationHub> hubContext,
        [FromServices] IEmailService emailService)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var success = await tenantRepo.CambiarActivoAsync(id, dto.Activo);
        if (!success)
            return Results.NotFound(new { message = "Tenant no encontrado" });

        // When deactivating: invalidate all sessions + notify users
        if (!dto.Activo)
        {
            // Bump SessionVersion for all tenant users → invalidates existing JWTs
            var tenantUsers = await db.Usuarios
                .IgnoreQueryFilters()
                .Where(u => u.TenantId == id && u.Activo)
                .ToListAsync();

            foreach (var user in tenantUsers)
            {
                user.SessionVersion++;
                // Invalidate session_version cache for each user
                cache.Remove($"session_version_{user.Id}");
            }

            // Revoke all active refresh tokens for tenant users
            var userIds = tenantUsers.Select(u => u.Id).ToList();
            var activeTokens = await db.RefreshTokens
                .Where(rt => userIds.Contains(rt.UserId) && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            foreach (var token in activeTokens)
            {
                token.IsRevoked = true;
                token.RevokedAt = DateTime.UtcNow;
            }

            // Close all active device sessions
            var activeSessions = await db.DeviceSessions
                .IgnoreQueryFilters()
                .Where(ds => userIds.Contains(ds.UsuarioId) && ds.Status == SessionStatus.Active)
                .ToListAsync();

            foreach (var session in activeSessions)
            {
                session.Status = SessionStatus.RevokedByUser;
                session.LoggedOutAt = DateTime.UtcNow;
                session.LogoutReason = "Tenant desactivado por SuperAdmin";
            }

            // Create notification for each user
            foreach (var user in tenantUsers)
            {
                db.NotificationHistory.Add(new NotificationHistory
                {
                    TenantId = id,
                    UsuarioId = user.Id,
                    Titulo = "Cuenta Desactivada",
                    Mensaje = "Su empresa ha sido desactivada por el administrador del sistema.",
                    Tipo = NotificationType.System,
                    Status = NotificationStatus.Sent,
                    CreadoEn = DateTime.UtcNow
                });
            }

            await db.SaveChangesAsync();

            // Invalidate tenant active cache in middleware
            cache.Remove($"tenant_active:{id}");

            // Push ForceLogout via SignalR to all connected users of this tenant
            await hubContext.Clients.Group($"tenant:{id}")
                .SendAsync("ForceLogout", new { reason = "TENANT_DEACTIVATED" });

            // Send deactivation email to admin users
            var tenant = await db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            var tenantName = tenant?.NombreEmpresa ?? "Empresa";
            var adminEmails = tenantUsers.Where(u => u.EsAdmin).Select(u => u.Email).ToList();
            if (adminEmails.Count > 0)
            {
                var html = EmailTemplates.TenantDeactivated(tenantName);
                _ = emailService.SendBulkAsync(adminEmails, "Cuenta Desactivada", html);
            }
        }
        else
        {
            // When reactivating: invalidate tenant cache so middleware allows access
            cache.Remove($"tenant_active:{id}");
        }

        return Results.Ok(new { message = dto.Activo ? "Tenant activado" : "Tenant desactivado" });
    }

    private static async Task<IResult> BatchToggleActivo(
        [FromBody] TenantBatchToggleRequest dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] ITenantRepository tenantRepo,
        [FromServices] HandySalesDbContext db,
        [FromServices] IMemoryCache cache,
        [FromServices] IHubContext<NotificationHub> hubContext)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        if (dto.Ids == null || dto.Ids.Count == 0)
            return Results.BadRequest(new { message = "Debe enviar al menos un ID" });

        int count = 0;
        foreach (var id in dto.Ids)
        {
            var success = await tenantRepo.CambiarActivoAsync(id, dto.Activo);
            if (!success) continue;
            count++;

            // Invalidate tenant cache
            cache.Remove($"tenant_active:{id}");

            if (!dto.Activo)
            {
                // Invalidate sessions for deactivated tenants
                var tenantUsers = await db.Usuarios
                    .IgnoreQueryFilters()
                    .Where(u => u.TenantId == id && u.Activo)
                    .ToListAsync();

                foreach (var user in tenantUsers)
                {
                    user.SessionVersion++;
                    cache.Remove($"session_version_{user.Id}");
                }

                var userIds = tenantUsers.Select(u => u.Id).ToList();
                var activeTokens = await db.RefreshTokens
                    .Where(rt => userIds.Contains(rt.UserId) && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow)
                    .ToListAsync();
                foreach (var token in activeTokens)
                {
                    token.IsRevoked = true;
                    token.RevokedAt = DateTime.UtcNow;
                }

                await db.SaveChangesAsync();

                await hubContext.Clients.Group($"tenant:{id}")
                    .SendAsync("ForceLogout", new { reason = "TENANT_DEACTIVATED" });
            }
        }

        return Results.Ok(new { message = $"{count} tenant(s) actualizados", count });
    }

    private static async Task<IResult> GetTenantUsers(
        int id,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySalesDbContext context)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenantExists = await context.Tenants.AsNoTracking().AnyAsync(t => t.Id == id);
        if (!tenantExists)
            return Results.NotFound(new { message = "Tenant no encontrado" });

        var users = await context.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == id)
            .OrderBy(u => u.Nombre)
            .Select(u => new TenantUserDto(
                u.Id,
                u.Nombre,
                u.Email,
                u.EsSuperAdmin ? "SUPER_ADMIN" :
                u.EsAdmin ? "ADMIN" :
                u.Role != null ? u.Role.Nombre : "Sin rol",
                u.Activo
            ))
            .ToListAsync();

        return Results.Ok(users);
    }

    private static async Task<IResult> CreateTenantUser(
        int id,
        [FromBody] TenantCreateUserDto dto,
        [FromServices] ICurrentTenant currentTenant,
        [FromServices] HandySalesDbContext context)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenant = await context.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (tenant == null)
            return Results.NotFound(new { message = "Tenant no encontrado" });

        // Verificar email duplicado
        var emailExists = await context.Usuarios
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(u => u.Email == dto.Email);
        if (emailExists)
            return Results.BadRequest(new { message = "Ya existe un usuario con ese email" });

        // Determinar rol
        var isAdmin = dto.Rol?.ToUpperInvariant() == "ADMIN";
        int? roleId = null;

        if (!isAdmin && !string.IsNullOrEmpty(dto.Rol))
        {
            var role = await context.Roles
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Nombre == dto.Rol);
            roleId = role?.Id;
        }

        var usuario = new Usuario
        {
            TenantId = id,
            Nombre = dto.Nombre,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            EsAdmin = isAdmin,
            EsSuperAdmin = false,
            RoleId = roleId,
            Activo = true,
            CreadoEn = DateTime.UtcNow,
            CreadoPor = currentTenant.UserId
        };

        context.Usuarios.Add(usuario);
        await context.SaveChangesAsync();

        return Results.Created($"/api/tenants/{id}/users/{usuario.Id}", new { id = usuario.Id });
    }
}
