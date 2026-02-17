using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HandySales.Infrastructure.Persistence;
using HandySales.Shared.Multitenancy;
using HandySales.Domain.Entities;
using System.Text.Json;

namespace HandySales.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard")
            .RequireAuthorization()
            .RequireCors("HandySalesPolicy");

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
    }

    private static async Task<IResult> GetDashboardMetrics(
        [FromServices] HandySalesDbContext context,
        [FromServices] ICurrentTenant currentTenant)
    {
        try
        {
            var tenantId = currentTenant.TenantId;
            var today = DateTime.UtcNow.Date;
            var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
            var startOfMonth = new DateTime(today.Year, today.Month, 1);

            // Ejecutar consultas de forma secuencial para evitar problemas de concurrencia
            var todayActivities = await context.ActivityLogs
                .Where(a => a.TenantId == tenantId && a.CreatedAt >= today)
                .CountAsync();

            var weekActivities = await context.ActivityLogs
                .Where(a => a.TenantId == tenantId && a.CreatedAt >= startOfWeek)
                .CountAsync();

            var monthlyLogins = await context.ActivityLogs
                .Where(a => a.TenantId == tenantId 
                    && a.ActivityType == "login" 
                    && a.CreatedAt >= startOfMonth)
                .CountAsync();

            var activeUsersToday = await context.ActivityLogs
                .Where(a => a.TenantId == tenantId && a.CreatedAt >= today)
                .Select(a => a.UserId)
                .Distinct()
                .CountAsync();

            var totalUsers = await context.Usuarios
                .Where(u => u.TenantId == tenantId && u.Activo)
                .CountAsync();

            var recentErrors = await context.ActivityLogs
                .Where(a => a.TenantId == tenantId 
                    && a.ActivityStatus == "failed" 
                    && a.CreatedAt >= today.AddDays(-7))
                .CountAsync();

            var metrics = new
            {
                // Actividad
                todayActivities = todayActivities,
                weekActivities = weekActivities,
                monthlyLogins = monthlyLogins,
                
                // Usuarios
                activeUsersToday = activeUsersToday,
                totalUsers = totalUsers,
                
                // Sistema
                recentErrors = recentErrors,
                systemHealth = recentErrors == 0 ? "healthy" : "warning",
                
                // Timestamps
                lastSync = DateTime.UtcNow,
                lastUpdate = DateTime.UtcNow
            };

            return Results.Ok(metrics);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error obteniendo métricas: {ex.Message}");
        }
    }

    private static async Task<IResult> GetRecentActivity(
        [FromServices] HandySalesDbContext context,
        [FromServices] ICurrentTenant currentTenant,
        [FromQuery] int limit = 50)
    {
        try
        {
            IQueryable<ActivityLog> query = context.ActivityLogs.Include(a => a.Usuario);

            // Filtrar según permisos
            if (currentTenant.IsSuperAdmin)
            {
                // Super Admin ve toda la actividad
                // No additional filtering needed
            }
            else if (currentTenant.IsAdmin)
            {
                // Admin ve solo actividad de su tenant
                query = query.Where(a => a.TenantId == currentTenant.TenantId);
            }
            else
            {
                // Usuario normal solo ve su propia actividad
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
        catch (Exception ex)
        {
            return Results.Problem($"Error obteniendo actividad: {ex.Message}");
        }
    }

    private static async Task<IResult> GetActivityChart(
        [FromServices] HandySalesDbContext context,
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
        catch (Exception ex)
        {
            return Results.Problem($"Error obteniendo datos del gráfico: {ex.Message}");
        }
    }

    private static async Task<IResult> GetMyPerformance(
        [FromServices] HandySalesDbContext context,
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
            return Results.Problem($"Error obteniendo rendimiento: {ex.Message}");
        }
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