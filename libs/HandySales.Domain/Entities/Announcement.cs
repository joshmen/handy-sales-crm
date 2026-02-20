using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

public enum AnnouncementType
{
    Broadcast = 0,
    Maintenance = 1,
    Banner = 2
}

public enum AnnouncementPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3
}

public enum AnnouncementDisplayMode
{
    Banner = 0,
    Notification = 1,
    Both = 2
}

[Table("Announcements")]
public class Announcement : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [Column("mensaje")]
    public string Mensaje { get; set; } = string.Empty;

    [Column("tipo")]
    public AnnouncementType Tipo { get; set; } = AnnouncementType.Broadcast;

    [Column("prioridad")]
    public AnnouncementPriority Prioridad { get; set; } = AnnouncementPriority.Normal;

    [Column("target_tenant_ids")]
    public string? TargetTenantIds { get; set; }

    [Column("target_roles")]
    public string? TargetRoles { get; set; }

    [Column("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }

    [Column("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    [Column("display_mode")]
    public AnnouncementDisplayMode DisplayMode { get; set; } = AnnouncementDisplayMode.Banner;

    [Column("is_dismissible")]
    public bool IsDismissible { get; set; } = true;

    [Column("super_admin_id")]
    public int SuperAdminId { get; set; }

    [Column("data_json")]
    public string? DataJson { get; set; }

    [Column("sent_count")]
    public int SentCount { get; set; }

    [Column("read_count")]
    public int ReadCount { get; set; }

    // Navigation
    public Usuario? SuperAdmin { get; set; }
    public List<AnnouncementDismissal> Dismissals { get; set; } = new();
}
