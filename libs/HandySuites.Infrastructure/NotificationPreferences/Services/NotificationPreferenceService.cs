using HandySuites.Application.NotificationPreferences.DTOs;
using HandySuites.Application.NotificationPreferences.Interfaces;
using HandySuites.Domain.Entities;
using HandySuites.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Infrastructure.NotificationPreferences.Services
{
    public class NotificationPreferenceService : INotificationPreferenceService
    {
        private readonly HandySuitesDbContext _context;

        public NotificationPreferenceService(HandySuitesDbContext context)
        {
            _context = context;
        }

        public async Task<NotificationPreferenceDto?> GetByUserIdAsync(int tenantId, int userId)
        {
            var preference = await _context.NotificationPreferences
                .FirstOrDefaultAsync(np => np.TenantId == tenantId && np.UserId == userId);

            return preference != null ? MapToDto(preference) : null;
        }

        public async Task<NotificationPreferenceDto?> CreateAsync(int tenantId, int userId, CreateNotificationPreferenceRequest request)
        {
            var existingPreference = await _context.NotificationPreferences
                .FirstOrDefaultAsync(np => np.TenantId == tenantId && np.UserId == userId);

            if (existingPreference != null)
            {
                return null; // Ya existe preferencia para este usuario
            }

            var preference = new NotificationPreference
            {
                TenantId = tenantId,
                UserId = userId,
                EmailNotifications = request.EmailNotifications,
                PushNotifications = request.PushNotifications,
                SmsNotifications = request.SmsNotifications,
                DesktopNotifications = request.DesktopNotifications,
                EmailOrderUpdates = request.EmailOrderUpdates,
                EmailInventoryAlerts = request.EmailInventoryAlerts,
                EmailWeeklyReports = request.EmailWeeklyReports,
                PushOrderUpdates = request.PushOrderUpdates,
                PushInventoryAlerts = request.PushInventoryAlerts,
                PushRouteReminders = request.PushRouteReminders,
                QuietHoursStart = request.QuietHoursStart,
                QuietHoursEnd = request.QuietHoursEnd,
                CreadoEn = DateTime.UtcNow,
                CreadoPor = userId.ToString()
            };

            _context.NotificationPreferences.Add(preference);
            await _context.SaveChangesAsync();

            return MapToDto(preference);
        }

        public async Task<NotificationPreferenceDto?> UpdateAsync(int tenantId, int userId, UpdateNotificationPreferenceRequest request)
        {
            var preference = await _context.NotificationPreferences
                .FirstOrDefaultAsync(np => np.TenantId == tenantId && np.UserId == userId && np.Id == request.Id);

            if (preference == null)
            {
                return null;
            }

            preference.EmailNotifications = request.EmailNotifications;
            preference.PushNotifications = request.PushNotifications;
            preference.SmsNotifications = request.SmsNotifications;
            preference.DesktopNotifications = request.DesktopNotifications;
            preference.EmailOrderUpdates = request.EmailOrderUpdates;
            preference.EmailInventoryAlerts = request.EmailInventoryAlerts;
            preference.EmailWeeklyReports = request.EmailWeeklyReports;
            preference.PushOrderUpdates = request.PushOrderUpdates;
            preference.PushInventoryAlerts = request.PushInventoryAlerts;
            preference.PushRouteReminders = request.PushRouteReminders;
            preference.QuietHoursStart = request.QuietHoursStart;
            preference.QuietHoursEnd = request.QuietHoursEnd;
            preference.ActualizadoEn = DateTime.UtcNow;
            preference.ActualizadoPor = userId.ToString();

            await _context.SaveChangesAsync();

            return MapToDto(preference);
        }

        public async Task<bool> DeleteAsync(int tenantId, int userId)
        {
            var preference = await _context.NotificationPreferences
                .FirstOrDefaultAsync(np => np.TenantId == tenantId && np.UserId == userId);

            if (preference == null)
            {
                return false;
            }

            _context.NotificationPreferences.Remove(preference);
            await _context.SaveChangesAsync();

            return true;
        }

        private static NotificationPreferenceDto MapToDto(NotificationPreference entity)
        {
            return new NotificationPreferenceDto
            {
                Id = entity.Id,
                UserId = entity.UserId,
                EmailNotifications = entity.EmailNotifications,
                PushNotifications = entity.PushNotifications,
                SmsNotifications = entity.SmsNotifications,
                DesktopNotifications = entity.DesktopNotifications,
                EmailOrderUpdates = entity.EmailOrderUpdates,
                EmailInventoryAlerts = entity.EmailInventoryAlerts,
                EmailWeeklyReports = entity.EmailWeeklyReports,
                PushOrderUpdates = entity.PushOrderUpdates,
                PushInventoryAlerts = entity.PushInventoryAlerts,
                PushRouteReminders = entity.PushRouteReminders,
                QuietHoursStart = entity.QuietHoursStart,
                QuietHoursEnd = entity.QuietHoursEnd,
                TenantId = entity.TenantId,
                CreatedDate = entity.CreadoEn,
                CreatedBy = int.TryParse(entity.CreadoPor, out var createdBy) ? createdBy : 0,
                LastModifiedDate = entity.ActualizadoEn,
                LastModifiedBy = int.TryParse(entity.ActualizadoPor, out var lastModifiedBy) ? lastModifiedBy : null
            };
        }
    }
}