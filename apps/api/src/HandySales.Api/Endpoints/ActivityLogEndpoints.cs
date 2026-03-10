using Microsoft.AspNetCore.Mvc;
using HandySales.Application.ActivityTracking.Interfaces;
using HandySales.Shared.Multitenancy;

namespace HandySales.Api.Endpoints;

public static class ActivityLogEndpoints
{
    public static void MapActivityLogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/activity-logs")
            .RequireAuthorization()
            .RequireCors("HandySalesPolicy");

        group.MapGet("/", GetActivityLogs)
            .WithName("GetActivityLogs")
            .WithSummary("Obtiene logs de actividad paginados con filtros");

        group.MapGet("/{entityType}/{entityId:int}", GetEntityLogs)
            .WithName("GetEntityLogs")
            .WithSummary("Obtiene logs de actividad para una entidad específica");
    }

    private static async Task<IResult> GetActivityLogs(
        [FromServices] IActivityTrackingRepository repository,
        [FromServices] ICurrentTenant currentTenant,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? activityType = null,
        [FromQuery] string? activityCategory = null,
        [FromQuery] string? activityStatus = null,
        [FromQuery] int? userId = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null,
        [FromQuery] string? search = null,
        [FromQuery] int? tenantId = null)
    {
        // Only Admin and SuperAdmin can see activity logs
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        // SuperAdmin: cross-tenant (null) or specific tenant filter
        // Admin: always scoped to own tenant
        int? effectiveTenantId = currentTenant.IsSuperAdmin
            ? tenantId   // null = all tenants, or specific tenantId
            : currentTenant.TenantId;

        DateTime? parsedDateFrom = null;
        DateTime? parsedDateTo = null;
        if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var df))
            parsedDateFrom = df;
        if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var dt))
            parsedDateTo = dt.Date.AddDays(1).AddTicks(-1); // End of day

        var (items, totalCount) = await repository.GetActivityLogsPaginatedAsync(
            effectiveTenantId,
            page,
            pageSize,
            activityType,
            activityCategory,
            activityStatus,
            userId,
            entityType,
            parsedDateFrom,
            parsedDateTo,
            search);

        var result = new
        {
            items = items.Select(a => new
            {
                a.Id,
                a.ActivityType,
                a.ActivityCategory,
                a.ActivityStatus,
                a.EntityType,
                a.EntityId,
                a.EntityName,
                a.Description,
                a.IpAddress,
                a.Browser,
                a.OperatingSystem,
                a.DeviceType,
                a.City,
                a.CountryName,
                a.CreatedAt,
                a.TenantId,
                tenantName = a.Tenant?.NombreEmpresa,
                userId = a.UserId,
                userName = a.Usuario?.Nombre ?? "Sistema",
            }),
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
        };

        return Results.Ok(result);
    }

    private static async Task<IResult> GetEntityLogs(
        string entityType,
        int entityId,
        [FromServices] IActivityTrackingRepository repository,
        [FromServices] ICurrentTenant currentTenant,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!currentTenant.IsAdmin && !currentTenant.IsSuperAdmin)
            return Results.Forbid();

        var tenantId = currentTenant.TenantId;

        var (items, totalCount) = await repository.GetActivityLogsPaginatedAsync(
            tenantId,
            page,
            pageSize,
            entityType: entityType);

        // Further filter by entityId (the paginated method doesn't support entityId filter)
        var filtered = items.Where(a => a.EntityId == entityId);

        var result = new
        {
            items = filtered.Select(a => new
            {
                a.Id,
                a.ActivityType,
                a.ActivityCategory,
                a.ActivityStatus,
                a.Description,
                a.CreatedAt,
                userId = a.UserId,
                userName = a.Usuario?.Nombre ?? "Sistema",
            }),
            totalCount,
            page,
            pageSize,
        };

        return Results.Ok(result);
    }
}
