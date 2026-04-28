using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HandySuites.Infrastructure.Persistence;
using HandySuites.Shared.Multitenancy;
using HandySuites.Application.Tenants.DTOs;
using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;
using System.Text.Json;

namespace HandySuites.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard")
            .RequireAuthorization()
            .RequireCors("HandySuitesPolicy");

        // Métricas del dashboard
        group.MapGet("/metrics", GetDashboardMetrics)
            .WithName("GetDashboardMetrics")
            .WithSummary("Obtiene métricas del dashboard para el tenant actual");

        // Actividad reciente
        group.MapGet("/activity", GetRecentActivity)
            .WithName("GetRecentActivity")  
            .WithSummary("Obtiene actividad reciente del tenant o usuario actual");

        // Actividades por fecha (para gráficos)
        group.MapGet("/activity/chart", GetActivityChart)
            .WithName("GetActivityChart")
            .WithSummary("Obtiene datos de actividad para gráficos del dashboard");

        // Rendimiento del vendedor actual
        group.MapGet("/my-performance", GetMyPerformance)
            .WithName("GetMyPerformance")
            .WithSummary("Obtiene métricas de rendimiento del vendedor autenticado");

        // Métricas cross-tenant para SuperAdmin
        group.MapGet("/system-metrics", GetSystemMetrics)
            .WithName("GetSystemMetrics")
            .WithSummary("Obtiene métricas globales del sistema (solo SuperAdmin)");

        // Tendencias del sistema para SuperAdmin (charts)
        group.MapGet("/system-trends", GetSystemTrends)
            .WithName("GetSystemTrends")
            .WithSummary("Obtiene tendencias del sistema para gráficos (solo SuperAdmin)");

        // Gestión global de usuarios para SuperAdmin
        group.MapGet("/global-users", GetGlobalUsers)
            .WithName("GetGlobalUsers")
            .WithSummary("Lista usuarios de todos los tenants (solo SuperAdmin)");
    }

    private static async Task<IResult> GetDashboardMetrics(
        [FromServices] HandySuitesDbContext context,
        [FromServices] ICurrentTenant currentTenant)
    {
        try
        {
            var tenantId = currentTenant.TenantId;

            var totalUsers = await context.Usuarios
                .Where(u => u.TenantId == tenantId && u.Activo)
                .CountAsync();

            // ActivityLogs queries — graceful fallback if table doesn't exist yet
            int todayActivities = 0, weekActivities = 0, monthlyLogins = 0, activeUsersToday = 0, recentErrors = 0;
            try
            {
                var today = DateTime.UtcNow.Date;
                var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
                var startOfMonth = new DateTime(today.Year, today.Month, 1);

                todayActivities = await context.ActivityLogs
                    .Where(a => a.TenantId == tenantId && a.CreatedAt >= today)
                    .CountAsync();

                weekActivities = await context.ActivityLogs
                    .Where(a => a.TenantId == tenantId && a.CreatedAt >= startOfWeek)
                    .CountAsync();

                monthlyLogins = await context.ActivityLogs
                    .Where(a => a.TenantId == tenantId
                        && a.ActivityType == "login"
                        && a.CreatedAt >= startOfMonth)
                    .CountAsync();

                activeUsersToday = await context.ActivityLogs
                    .Where(a => a.TenantId == tenantId && a.CreatedAt >= today)
                    .Select(a => a.UserId)
                    .Distinct()
                    .CountAsync();

                recentErrors = await context.ActivityLogs
                    .Where(a => a.TenantId == tenantId
                        && a.ActivityStatus == "failed"
                        && a.CreatedAt >= today.AddDays(-7))
                    .CountAsync();
            }
            catch
            {
                // activity_logs table may not exist yet — return zeros
            }

            var metrics = new
            {
                todayActivities,
                weekActivities,
                monthlyLogins,
                activeUsersToday,
                totalUsers,
                recentErrors,
                systemHealth = recentErrors == 0 ? "healthy" : "warning",
                lastSync = DateTime.UtcNow,
                lastUpdate = DateTime.UtcNow
            };

            return Results.Ok(metrics);
        }
        catch (Exception ex)
        {
            return Results.Problem("Error obteniendo métricas");
        }
    }

    private static async Task<IResult> GetRecentActivity(
        [FromServices] HandySuitesDbContext context,
        [FromServices] ICurrentTenant currentTenant,
        [FromQuery] int limit = 50)
    {
        try
        {
            limit = Math.Min(limit, 200);

            IQueryable<ActivityLog> query = context.ActivityLogs.AsNoTracking().Include(a => a.Usuario);

            if (currentTenant.IsSuperAdmin)
            {
                // Super Admin ve toda la actividad
            }
            else if (currentTenant.IsAdmin)
            {
                query = query.Where(a => a.TenantId == currentTenant.TenantId);
            }
            else
            {
                if (int.TryParse(currentTenant.UserId, out var userId))
                {
                    query = query.Where(a => a.UserId == userId);
                }
            }

            var activities = await query.OrderByDescending(a => a.CreatedAt).Take(limit).Select(a => new
            {
                id = a.Id,
                type = a.ActivityType,
                category = a.ActivityCategory,
                status = a.ActivityStatus,
                description = a.Description,
                userName = a.Usuario != null ? a.Usuario.Nombre : "Sistema",
                userEmail = a.Usuario != null ? a.Usuario.Email : null,
                ipAddress = a.IpAddress,
                browser = a.Browser,
                operatingSystem = a.OperatingSystem,
                deviceType = a.DeviceType,
                createdAt = a.CreatedAt,
                timeAgo = GetTimeAgo(a.CreatedAt)
            }).ToListAsync();

            return Results.Ok(new { activities });
        }
        catch
        {
            // activity_logs table may not exist yet
            return Results.Ok(new { activities = Array.Empty<object>() });
        }
    }

    private static async Task<IResult> GetActivityChart(
        [FromServices] HandySuitesDbContext context,
        [FromServices] ICurrentTenant currentTenant,
        [FromQuery] int days = 7)
    {
        try
        {
            var tenantId = currentTenant.TenantId;
            var startDate = DateTime.UtcNow.Date.AddDays(-days);

            var activityData = await context.ActivityLogs
                .Where(a => a.TenantId == tenantId && a.CreatedAt >= startDate)
                .GroupBy(a => a.CreatedAt.Date)
                .Select(g => new
                {
                    date = g.Key,
                    totalActivities = g.Count(),
                    logins = g.Count(x => x.ActivityType == "login"),
                    errors = g.Count(x => x.ActivityStatus == "failed"),
                    uniqueUsers = g.Select(x => x.UserId).Distinct().Count()
                })
                .OrderBy(x => x.date)
                .ToListAsync();

            // Llenar los días faltantes con ceros
            var chartData = new List<object>();
            for (int i = days; i >= 0; i--)
            {
                var date = DateTime.UtcNow.Date.AddDays(-i);
                var dayData = activityData.FirstOrDefault(a => a.date == date);
                
                chartData.Add(new
                {
                    date = date.ToString("MMM dd"),
                    fullDate = date,
                    totalActivities = dayData?.totalActivities ?? 0,
                    logins = dayData?.logins ?? 0,
                    errors = dayData?.errors ?? 0,
                    uniqueUsers = dayData?.uniqueUsers ?? 0
                });
            }

            return Results.Ok(new { chartData });
        }
        catch
        {
            // activity_logs table may not exist yet — return empty chart
            var emptyChart = new List<object>();
            for (int i = days; i >= 0; i--)
            {
                var d = DateTime.UtcNow.Date.AddDays(-i);
                emptyChart.Add(new { date = d.ToString("MMM dd"), fullDate = d, totalActivities = 0, logins = 0, errors = 0, uniqueUsers = 0 });
            }
            return Results.Ok(new { chartData = emptyChart });
        }
    }

    private static async Task<IResult> GetMyPerformance(
        [FromServices] HandySuitesDbContext context,
        [FromServices] ICurrentTenant currentTenant,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        try
        {
            if (!int.TryParse(currentTenant.UserId, out var userId))
                return Results.Unauthorized();

            var tenantId = currentTenant.TenantId;
            var today = DateTime.UtcNow.Date;
            var desde = startDate != null ? DateTime.Parse(startDate) : today.AddDays(-30);
            var hasta = endDate != null ? DateTime.Parse(endDate) : today.AddDays(1);

            // Mis pedidos (proyección para evitar columnas faltantes en DB)
            var pedidosPeriodo = await context.Pedidos
                .AsNoTracking()
                .Where(p => p.TenantId == tenantId && p.UsuarioId == userId && p.Activo)
                .Where(p => p.FechaPedido >= desde && p.FechaPedido < hasta)
                .Select(p => new { p.Total, p.Estado })
                .ToListAsync();

            // Mis visitas
            var misVisitas = await context.ClienteVisitas
                .AsNoTracking()
                .Where(v => v.TenantId == tenantId && v.UsuarioId == userId && v.Activo)
                .Where(v => v.FechaProgramada >= desde && v.FechaProgramada < hasta)
                .Select(v => new { v.Resultado })
                .ToListAsync();

            // Mis rutas
            var misRutas = await context.RutasVendedor
                .AsNoTracking()
                .Where(r => r.TenantId == tenantId && r.UsuarioId == userId && r.Activo == true)
                .Where(r => r.Fecha >= desde && r.Fecha < hasta)
                .Select(r => new { r.Estado, r.Fecha })
                .ToListAsync();

            // Mis clientes (asignados)
            var misClientes = await context.Clientes
                .AsNoTracking()
                .Where(c => c.TenantId == tenantId && c.Activo
                    && (c.VendedorId == userId || c.VendedorId == null))
                .CountAsync();

            var visitasTotal = misVisitas.Count;
            var visitasConVenta = misVisitas.Count(v => v.Resultado == ResultadoVisita.Venta);

            var performance = new
            {
                // Ventas
                totalVentas = pedidosPeriodo.Sum(p => p.Total),
                pedidosCount = pedidosPeriodo.Count,
                pedidosEntregados = pedidosPeriodo.Count(p => p.Estado == EstadoPedido.Entregado),
                pedidosPendientes = pedidosPeriodo.Count(p => p.Estado != EstadoPedido.Entregado && p.Estado != EstadoPedido.Cancelado),

                // Visitas
                visitasTotal,
                visitasCompletadas = misVisitas.Count(v => v.Resultado != ResultadoVisita.Pendiente),
                visitasConVenta,
                efectividadVisitas = visitasTotal > 0
                    ? Math.Round((double)visitasConVenta / visitasTotal * 100, 1)
                    : 0,

                // Rutas
                rutasTotal = misRutas.Count,
                rutasCompletadas = misRutas.Count(r => r.Estado == EstadoRuta.Completada || r.Estado == EstadoRuta.Cerrada),
                rutasHoy = misRutas.Count(r => r.Fecha.Date == today),

                // Clientes
                clientesAsignados = misClientes,

                // Periodo
                desde = desde,
                hasta = hasta
            };

            return Results.Ok(performance);
        }
        catch (Exception ex)
        {
            return Results.Problem("Error obteniendo rendimiento");
        }
    }

    private static async Task<IResult> GetSystemMetrics(
        [FromServices] HandySuitesDbContext context,
        [FromServices] ICurrentTenant currentTenant)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        // IgnoreQueryFilters() to get cross-tenant data for SuperAdmin
        // EF Core DbContext is NOT thread-safe — queries must be sequential
        var totalTenants = await context.Tenants.AsNoTracking().CountAsync();
        var activeTenants = await context.Tenants.AsNoTracking().CountAsync(t => t.Activo);
        var totalUsuarios = await context.Usuarios.IgnoreQueryFilters().AsNoTracking().CountAsync(u => u.Activo);
        var totalProductos = await context.Productos.IgnoreQueryFilters().AsNoTracking().CountAsync();
        var totalClientes = await context.Clientes.IgnoreQueryFilters().AsNoTracking().CountAsync();
        var totalPedidos = await context.Pedidos.IgnoreQueryFilters().AsNoTracking().CountAsync();
        var totalVentas = await context.Pedidos.IgnoreQueryFilters().AsNoTracking()
            .Where(p => p.Estado == EstadoPedido.Entregado)
            .SumAsync(p => (decimal?)p.Total) ?? 0;
        var tenantsRecientes = await context.Tenants.AsNoTracking()
            .OrderByDescending(t => t.CreadoEn)
            .Take(5)
            .Select(t => new { t.Id, t.NombreEmpresa, t.PlanTipo, t.Activo, t.CreadoEn })
            .ToListAsync();
        var topTenantsRaw = await context.Pedidos.IgnoreQueryFilters().AsNoTracking()
            .GroupBy(p => p.TenantId)
            .Select(g => new { TenantId = g.Key, Pedidos = g.Count(), Ventas = g.Sum(p => p.Total) })
            .OrderByDescending(t => t.Ventas)
            .Take(5)
            .ToListAsync();

        var topTenantIds = topTenantsRaw.Select(t => t.TenantId).ToList();
        var recentTenantIds = tenantsRecientes.Select(t => t.Id).ToList();
        var allTenantIds = topTenantIds.Union(recentTenantIds).Distinct().ToList();

        var tenantNames = await context.Tenants.AsNoTracking()
            .Where(t => allTenantIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => t.NombreEmpresa);
        var recentUserCounts = await context.Usuarios.IgnoreQueryFilters().AsNoTracking()
            .Where(u => recentTenantIds.Contains(u.TenantId) && u.Activo)
            .GroupBy(u => u.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TenantId, x => x.Count);

        var enrichedTopTenants = topTenantsRaw.Select(t => new TopTenantDto(
            t.TenantId,
            tenantNames.GetValueOrDefault(t.TenantId, "Desconocido"),
            t.Pedidos,
            t.Ventas
        )).ToList();

        var tenantsRecientesDto = tenantsRecientes.Select(t => new TenantListDto(
            t.Id,
            t.NombreEmpresa,
            null,
            t.Activo,
            t.PlanTipo,
            recentUserCounts.GetValueOrDefault(t.Id, 0),
            null,
            true
        )).ToList();

        var result = new SystemMetricsDto(
            totalTenants,
            activeTenants,
            totalUsuarios,
            totalClientes,
            totalProductos,
            totalPedidos,
            totalVentas,
            tenantsRecientesDto,
            enrichedTopTenants
        );

        return Results.Ok(result);
    }

    private static async Task<IResult> GetSystemTrends(
        [FromServices] HandySuitesDbContext context,
        [FromServices] ICurrentTenant currentTenant,
        [FromQuery] int days = 30)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        if (days < 1) days = 7;
        if (days > 365) days = 365;

        var startDate = DateTime.UtcNow.Date.AddDays(-days);

        // EF Core DbContext is NOT thread-safe — all queries must be sequential

        // 1. Tenant growth by day
        var tenantsByDay = await context.Tenants.AsNoTracking()
            .Where(t => t.CreadoEn >= startDate)
            .GroupBy(t => t.CreadoEn.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        var totalTenantsBefore = await context.Tenants.AsNoTracking()
            .CountAsync(t => t.CreadoEn < startDate);

        var tenantGrowth = new List<DailyMetricDto>();
        var cumulative = (decimal)totalTenantsBefore;
        for (var d = startDate; d <= DateTime.UtcNow.Date; d = d.AddDays(1))
        {
            var dayCount = tenantsByDay.FirstOrDefault(x => x.Date == d)?.Count ?? 0;
            cumulative += dayCount;
            tenantGrowth.Add(new DailyMetricDto(d.ToString("yyyy-MM-dd"), cumulative));
        }

        // 2. Revenue by day (Pedidos entregados) — fetch raw then group in memory
        var rawRevenue = await context.Pedidos.IgnoreQueryFilters().AsNoTracking()
            .Where(p => p.Estado == EstadoPedido.Entregado && p.FechaPedido >= startDate)
            .Select(p => new { p.FechaPedido, p.Total })
            .ToListAsync();

        var revenueByDay = rawRevenue
            .GroupBy(p => p.FechaPedido.Date)
            .Select(g => new DailyMetricDto(g.Key.ToString("yyyy-MM-dd"), g.Sum(p => p.Total)))
            .OrderBy(x => x.Date)
            .ToList();

        // 3. User growth by day
        var usersByDay = await context.Usuarios.IgnoreQueryFilters().AsNoTracking()
            .Where(u => u.CreadoEn >= startDate)
            .GroupBy(u => u.CreadoEn.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        var totalUsersBefore = await context.Usuarios.IgnoreQueryFilters().AsNoTracking()
            .CountAsync(u => u.CreadoEn < startDate);

        var userGrowth = new List<DailyMetricDto>();
        var userCumulative = (decimal)totalUsersBefore;
        for (var d = startDate; d <= DateTime.UtcNow.Date; d = d.AddDays(1))
        {
            var dayCount = usersByDay.FirstOrDefault(x => x.Date == d)?.Count ?? 0;
            userCumulative += dayCount;
            userGrowth.Add(new DailyMetricDto(d.ToString("yyyy-MM-dd"), userCumulative));
        }

        // 4. Subscription plan distribution
        var planGroups = await context.Tenants.AsNoTracking()
            .Where(t => t.Activo)
            .GroupBy(t => t.PlanTipo ?? "Sin Plan")
            .Select(g => new { Plan = g.Key, Count = g.Count() })
            .ToListAsync();

        var totalActive = planGroups.Sum(x => x.Count);
        var planBreakdown = planGroups.Select(x => new PlanDistributionDto(
            x.Plan,
            x.Count,
            totalActive > 0 ? Math.Round((decimal)x.Count / totalActive * 100, 1) : 0
        )).ToList();

        return Results.Ok(new SystemTrendsDto(tenantGrowth, revenueByDay, userGrowth, planBreakdown));
    }

    private static async Task<IResult> GetGlobalUsers(
        [FromServices] HandySuitesDbContext context,
        [FromServices] ICurrentTenant currentTenant,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] int? tenantId = null,
        [FromQuery] string? rol = null,
        [FromQuery] bool? activo = null)
    {
        if (!currentTenant.IsSuperAdmin)
            return Results.Forbid();

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = context.Usuarios.IgnoreQueryFilters().AsNoTracking()
            .Include(u => u.Tenant)
            .Where(u => u.EliminadoEn == null); // respect soft deletes

        if (tenantId.HasValue)
            query = query.Where(u => u.TenantId == tenantId.Value);

        if (!string.IsNullOrEmpty(rol))
        {
            query = query.Where(u => u.RolExplicito == rol);
        }

        if (activo.HasValue)
            query = query.Where(u => u.Activo == activo.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(u =>
                u.Nombre.Contains(search) ||
                u.Email.Contains(search));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(u => u.Tenant.NombreEmpresa)
            .ThenBy(u => u.Nombre)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Nombre,
                u.Email,
                u.RolExplicito,
                u.Activo,
                u.TenantId,
                TenantNombre = u.Tenant.NombreEmpresa,
                u.CreadoEn
            })
            .ToListAsync();

        var dtos = items.Select(u => new GlobalUserDto(
            u.Id,
            u.Nombre,
            u.Email,
            u.RolExplicito ?? RoleNames.Vendedor,
            u.Activo,
            u.TenantId,
            u.TenantNombre,
            u.CreadoEn
        )).ToList();

        return Results.Ok(new
        {
            items = dtos,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
        });
    }

    private static string GetTimeAgo(DateTime dateTime)
    {
        var timeSpan = DateTime.UtcNow - dateTime;
        
        if (timeSpan.TotalMinutes < 1)
            return "Hace un momento";
        if (timeSpan.TotalMinutes < 60)
            return $"Hace {(int)timeSpan.TotalMinutes} min";
        if (timeSpan.TotalHours < 24)
            return $"Hace {(int)timeSpan.TotalHours} horas";
        if (timeSpan.TotalDays < 7)
            return $"Hace {(int)timeSpan.TotalDays} días";
        
        return dateTime.ToString("dd/MM/yyyy");
    }
}