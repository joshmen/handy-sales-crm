using HandySales.Domain.Entities;

namespace HandySales.Application.ActivityTracking.Interfaces;

public interface IActivityTrackingRepository
{
    Task<ActivityLog> CreateActivityLogAsync(ActivityLog activityLog);
    Task<IEnumerable<ActivityLog>> GetActivityLogsAsync(int tenantId, int? userId = null, int limit = 50);
    Task<int> GetActivitiesCountAsync(int tenantId, DateTime? fromDate = null, string? activityType = null, string? status = null);
    Task<int> GetUniqueUsersCountAsync(int tenantId, DateTime? fromDate = null);
    Task<IEnumerable<object>> GetActivityChartDataAsync(int tenantId, int days = 7);
}