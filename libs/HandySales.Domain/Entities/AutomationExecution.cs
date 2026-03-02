using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

public enum ExecutionStatus { Success = 0, Failed = 1, Skipped = 2 }

[Table("AutomationExecutions")]
public class AutomationExecution
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

    [Column("trigger_entity")]
    [MaxLength(100)]
    public string? TriggerEntity { get; set; }

    [Column("trigger_entity_id")]
    public int? TriggerEntityId { get; set; }

    [Column("status")]
    public ExecutionStatus Status { get; set; }

    [Column("action_taken")]
    [MaxLength(500)]
    public string ActionTaken { get; set; } = "";

    [Column("resultado_json")]
    public string? ResultadoJson { get; set; }

    [Column("error_message")]
    [MaxLength(1000)]
    public string? ErrorMessage { get; set; }

    [Column("ejecutado_en")]
    public DateTime EjecutadoEn { get; set; } = DateTime.UtcNow;

    // Navigation
    public TenantAutomation Automation { get; set; } = null!;
}
