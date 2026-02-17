using HandySales.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace HandySales.Domain.Entities
{
    public class NotificationPreference : AuditableEntity
    {
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        public virtual Usuario? User { get; set; }
        
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
        
        // Relación con tenant
        public int TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }
    }
}