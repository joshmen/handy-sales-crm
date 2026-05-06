using HandySuites.Application.ActivityTracking.Interfaces;
using HandySuites.Application.Common.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.ActivityTracking.Repositories;

public class ActivityTrackingRepository : IActivityTrackingRepository
{
    private readonly HandySuitesDbContext _context;
    private readonly ITenantTimeZoneService _tenantTz;

    public ActivityTrackingRepository(HandySuitesDbContext context, ITenantTimeZoneService tenantTz)
    {
        _context = context;
        _tenantTz = tenantTz;
    }

    public async Task<ActivityLog> CreateActivityLogAsync(ActivityLog activityLog)
    {
        _context.ActivityLogs.Add(activityLog);
        await _context.SaveChangesAsync();
        return activityLog;
    }

    public async Task<IEnumerable<ActivityLog>> GetActivityLogsAsync(int tenantId, int? userId = null, int limit = 50)
    {
        var query = _context.ActivityLogs
            .Include(a => a.Usuario)
            .Where(a => a.TenantId == tenantId);

        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        return await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<(IEnumerable<ActivityLog> Items, int TotalCount)> GetActivityLogsPaginatedAsync(
        int? tenantId,
        int page = 1,
        int pageSize = 20,
        string? activityType = null,
        string? activityCategory = null,
        string? activityStatus = null,
        int? userId = null,
        string? entityType = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        string? search = null)
    {
        IQueryable<ActivityLog> query;

        if (tenantId.HasValue)
        {
            // Tenant-scoped query (Admin or SuperAdmin filtering by specific tenant)
            query = _context.ActivityLogs
                .AsNoTracking()
                .Include(a => a.Usuario)
                .Where(a => a.TenantId == tenantId.Value);
        }
        else
        {
            // Cross-tenant query (SuperAdmin sees all tenants)
            query = _context.ActivityLogs
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Include(a => a.Usuario)
                .Include(a => a.Tenant);
        }

        if (!string.IsNullOrEmpty(activityType))
            query = query.Where(a => a.ActivityType == activityType);

        if (!string.IsNullOrEmpty(activityCategory))
            query = query.Where(a => a.ActivityCategory == activityCategory);

        if (!string.IsNullOrEmpty(activityStatus))
            query = query.Where(a => a.ActivityStatus == activityStatus);

        if (userId.HasValue)
            query = query.Where(a => a.UserId == userId.Value);

        if (!string.IsNullOrEmpty(entityType))
            query = query.Where(a => a.EntityType == entityType);

        if (dateFrom.HasValue)
            query = query.Where(a => a.CreatedAt >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(a => a.CreatedAt <= dateTo.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(a =>
                (a.Description != null && a.Description.Contains(search)) ||
                (a.EntityName != null && a.EntityName.Contains(search)) ||
                (a.IpAddress != null && a.IpAddress.Contains(search)));

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<int> GetActivitiesCountAsync(int tenantId, DateTime? fromDate = null, string? activityType = null, string? status = null)
    {
        var query = _context.ActivityLogs.Where(a => a.TenantId == tenantId);

        if (fromDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= fromDate.Value);
        }

        if (!string.IsNullOrEmpty(activityType))
        {
            query = query.Where(a => a.ActivityType == activityType);
        }

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(a => a.ActivityStatus == status);
        }

        return await query.CountAsync();
    }

    public async Task<int> GetUniqueUsersCountAsync(int tenantId, DateTime? fromDate = null)
    {
        var query = _context.ActivityLogs.Where(a => a.TenantId == tenantId);

        if (fromDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= fromDate.Value);
        }

        return await query.Select(a => a.UserId).Distinct().CountAsync();
    }

    public async Task<IEnumerable<object>> GetActivityChartDataAsync(int tenantId, int days = 7)
    {
        // Ventana y agrupamiento en TZ tenant. SQL agrupa por UTC, así que
        // traemos rows crudos y agrupamos por día tenant en memoria.
        var todayTenant = await _tenantTz.GetTenantTodayAsync();
        var startTenant = todayTenant.AddDays(-days);
        var startUtc = await _tenantTz.ConvertTenantDateToUtcAsync(startTenant);
        var tzInfo = await _tenantTz.GetTimeZoneForTenantAsync(tenantId);

        var rawRows = await _context.ActivityLogs
            .Where(a => a.TenantId == tenantId && a.CreatedAt >= startUtc)
            .Select(a => new { a.CreatedAt, a.ActivityType, a.ActivityStatus, a.UserId })
            .ToListAsync();

        DateOnly TenantDayOf(DateTime utc) => DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc),
                tzInfo));

        var activityData = rawRows
            .GroupBy(a => TenantDayOf(a.CreatedAt))
            .Select(g => new
            {
                date = g.Key,
                totalActivities = g.Count(),
                logins = g.Count(x => x.ActivityType == "login"),
                errors = g.Count(x => x.ActivityStatus == "failed"),
                uniqueUsers = g.Select(x => x.UserId).Distinct().Count()
            })
            .ToList();

        var chartData = new List<object>();
        for (int i = days; i >= 0; i--)
        {
            var date = todayTenant.AddDays(-i);
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

        return chartData;
    }
}