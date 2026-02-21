using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("scheduled_actions")]
public class ScheduledAction
{
    [Column("id")]
    public int Id { get; set; }

    [Column("action_type")]
    public string ActionType { get; set; } = string.Empty;

    [Column("target_id")]
    public int TargetId { get; set; }

    [Column("scheduled_at")]
    public DateTime ScheduledAt { get; set; }

    [Column("executed_at")]
    public DateTime? ExecutedAt { get; set; }

    [Column("cancelled_at")]
    public DateTime? CancelledAt { get; set; }

    [Column("status")]
    public string Status { get; set; } = "Pending";

    [Column("notification_sent")]
    public bool NotificationSent { get; set; }

    [Column("reason")]
    public string? Reason { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_by_user_id")]
    public int CreatedByUserId { get; set; }

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}
