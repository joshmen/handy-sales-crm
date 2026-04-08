using HandySuites.Domain.Entities;

namespace HandySuites.Application.ActivityTracking.Interfaces;

public interface IActivityTrackingRepository
{
    Task<ActivityLog> CreateActivityLogAsync(ActivityLog activityLog);
    Task<IEnumerable<ActivityLog>> GetActivityLogsAsync(int tenantId, int? userId = null, int limit = 50);
    Task<(IEnumerable<ActivityLog> Items, int TotalCount)> GetActivityLogsPaginatedAsync(
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
        string? search = null);
    Task<int> GetActivitiesCountAsync(int tenantId, DateTime? fromDate = null, string? activityType = null, string? status = null);
    Task<int> GetUniqueUsersCountAsync(int tenantId, DateTime? fromDate = null);
    Task<IEnumerable<object>> GetActivityChartDataAsync(int tenantId, int days = 7);
}