using HandySales.Application.ActivityTracking.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.ActivityTracking.Repositories;

public class ActivityTrackingRepository : IActivityTrackingRepository
{
    private readonly HandySalesDbContext _context;

    public ActivityTrackingRepository(HandySalesDbContext context)
    {
        _context = context;
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
        var startDate = DateTime.UtcNow.Date.AddDays(-days);

        var activityData = await _context.ActivityLogs
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

        return chartData;
    }
}