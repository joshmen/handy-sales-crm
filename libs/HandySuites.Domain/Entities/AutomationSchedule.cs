using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

public enum ScheduleStatus { Pending = 0, Processing = 1, Completed = 2, Failed = 3 }

[Table("AutomationSchedules")]
public class AutomationSchedule
{
    [Column("id")]
    public long Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("automation_id")]
    public int AutomationId { get; set; }

    [Column("template_slug")]
    [MaxLength(50)]
    public string TemplateSlug { get; set; } = "";

    [Column("scheduled_at")]
    public DateTime ScheduledAt { get; set; }

    [Column("status")]
    public ScheduleStatus Status { get; set; } = ScheduleStatus.Pending;

    [Column("picked_at")]
    public DateTime? PickedAt { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("error_message")]
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }

    [Column("attempt")]
    public int Attempt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public TenantAutomation Automation { get; set; } = null!;
}
