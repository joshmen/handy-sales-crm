using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("TenantAutomations")]
public class TenantAutomation : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("template_id")]
    public int TemplateId { get; set; }

    [Column("params_json")]
    public string? ParamsJson { get; set; }

    [Column("activated_by")]
    public int? ActivatedBy { get; set; }

    [Column("last_executed_at")]
    public DateTime? LastExecutedAt { get; set; }

    [Column("execution_count")]
    public int ExecutionCount { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public AutomationTemplate Template { get; set; } = null!;
    public Usuario? ActivatedByUser { get; set; }
}
