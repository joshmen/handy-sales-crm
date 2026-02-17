using HandySales.Application.NotificationPreferences.DTOs;

namespace HandySales.Application.NotificationPreferences.Interfaces
{
    public interface INotificationPreferenceService
    {
        Task<NotificationPreferenceDto?> GetByUserIdAsync(int tenantId, int userId);
        Task<NotificationPreferenceDto?> CreateAsync(int tenantId, int userId, CreateNotificationPreferenceRequest request);
        Task<NotificationPreferenceDto?> UpdateAsync(int tenantId, int userId, UpdateNotificationPreferenceRequest request);
        Task<bool> DeleteAsync(int tenantId, int userId);
    }
}