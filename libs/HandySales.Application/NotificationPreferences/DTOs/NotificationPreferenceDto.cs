namespace HandySales.Application.NotificationPreferences.DTOs
{
    public class NotificationPreferenceDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public bool EmailNotifications { get; set; } = true;
        public bool PushNotifications { get; set; } = true;
        public bool SmsNotifications { get; set; } = false;
        public bool DesktopNotifications { get; set; } = true;
        
        // Configuraciones específicas de email
        public bool EmailOrderUpdates { get; set; } = true;
        public bool EmailInventoryAlerts { get; set; } = true;
        public bool EmailWeeklyReports { get; set; } = true;
        
        // Configuraciones específicas de push
        public bool PushOrderUpdates { get; set; } = true;
        public bool PushInventoryAlerts { get; set; } = true;
        public bool PushRouteReminders { get; set; } = true;
        
        // Horario de notificaciones
        public TimeOnly? QuietHoursStart { get; set; }
        public TimeOnly? QuietHoursEnd { get; set; }
        
        public int TenantId { get; set; }
        public DateTime CreatedDate { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? LastModifiedDate { get; set; }
        public int? LastModifiedBy { get; set; }
    }
    
    public class CreateNotificationPreferenceRequest
    {
        public bool EmailNotifications { get; set; } = true;
        public bool PushNotifications { get; set; } = true;
        public bool SmsNotifications { get; set; } = false;
        public bool DesktopNotifications { get; set; } = true;
        
        public bool EmailOrderUpdates { get; set; } = true;
        public bool EmailInventoryAlerts { get; set; } = true;
        public bool EmailWeeklyReports { get; set; } = true;
        
        public bool PushOrderUpdates { get; set; } = true;
        public bool PushInventoryAlerts { get; set; } = true;
        public bool PushRouteReminders { get; set; } = true;
        
        public TimeOnly? QuietHoursStart { get; set; }
        public TimeOnly? QuietHoursEnd { get; set; }
    }
    
    public class UpdateNotificationPreferenceRequest
    {
        public int Id { get; set; }
        public bool EmailNotifications { get; set; } = true;
        public bool PushNotifications { get; set; } = true;
        public bool SmsNotifications { get; set; } = false;
        public bool DesktopNotifications { get; set; } = true;
        
        public bool EmailOrderUpdates { get; set; } = true;
        public bool EmailInventoryAlerts { get; set; } = true;
        public bool EmailWeeklyReports { get; set; } = true;
        
        public bool PushOrderUpdates { get; set; } = true;
        public bool PushInventoryAlerts { get; set; } = true;
        public bool PushRouteReminders { get; set; } = true;
        
        public TimeOnly? QuietHoursStart { get; set; }
        public TimeOnly? QuietHoursEnd { get; set; }
    }
}