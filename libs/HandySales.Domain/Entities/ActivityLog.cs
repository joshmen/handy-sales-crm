using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities
{
    [Table("activity_logs")]
    public class ActivityLog
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("tenant_id")]
        public int TenantId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        // Información de la actividad
        [Column("activity_type")]
        [Required]
        [MaxLength(50)]
        public string ActivityType { get; set; } = string.Empty; // login, logout, create, update, delete, view, export, error

        [Column("activity_category")]
        [Required]
        [MaxLength(50)]
        public string ActivityCategory { get; set; } = string.Empty; // auth, users, products, orders, clients, system

        [Column("activity_status")]
        [MaxLength(20)]
        public string ActivityStatus { get; set; } = "success"; // success, failed, warning, pending

        // Detalles de la acción
        [Column("entity_type")]
        [MaxLength(50)]
        public string? EntityType { get; set; }

        [Column("entity_id")]
        public int? EntityId { get; set; }

        [Column("entity_name")]
        [MaxLength(255)]
        public string? EntityName { get; set; }

        [Column("old_values", TypeName = "json")]
        public string? OldValues { get; set; }

        [Column("new_values", TypeName = "json")]
        public string? NewValues { get; set; }

        // Información de auditoría
        [Column("ip_address")]
        [MaxLength(45)]
        public string? IpAddress { get; set; }

        [Column("user_agent")]
        public string? UserAgent { get; set; }

        [Column("browser")]
        [MaxLength(100)]
        public string? Browser { get; set; }

        [Column("browser_version")]
        [MaxLength(20)]
        public string? BrowserVersion { get; set; }

        [Column("operating_system")]
        [MaxLength(100)]
        public string? OperatingSystem { get; set; }

        [Column("device_type")]
        [MaxLength(50)]
        public string? DeviceType { get; set; }

        // Geolocalización
        [Column("country_code")]
        [MaxLength(2)]
        public string? CountryCode { get; set; }

        [Column("country_name")]
        [MaxLength(100)]
        public string? CountryName { get; set; }

        [Column("city")]
        [MaxLength(100)]
        public string? City { get; set; }

        [Column("region")]
        [MaxLength(100)]
        public string? Region { get; set; }

        [Column("latitude")]
        public decimal? Latitude { get; set; }

        [Column("longitude")]
        public decimal? Longitude { get; set; }

        // Información adicional
        [Column("session_id")]
        [MaxLength(255)]
        public string? SessionId { get; set; }

        [Column("request_id")]
        [MaxLength(255)]
        public string? RequestId { get; set; }

        [Column("request_method")]
        [MaxLength(10)]
        public string? RequestMethod { get; set; }

        [Column("request_url")]
        public string? RequestUrl { get; set; }

        [Column("response_status")]
        public int? ResponseStatus { get; set; }

        [Column("response_time_ms")]
        public int? ResponseTimeMs { get; set; }

        // Metadata adicional
        [Column("description")]
        public string? Description { get; set; }

        [Column("error_message")]
        public string? ErrorMessage { get; set; }

        [Column("stack_trace")]
        public string? StackTrace { get; set; }

        [Column("additional_data", TypeName = "json")]
        public string? AdditionalData { get; set; }

        // Timestamps
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("TenantId")]
        public virtual Tenant? Tenant { get; set; }

        [ForeignKey("UserId")]
        public virtual Usuario? Usuario { get; set; }
    }
}