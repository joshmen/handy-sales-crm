using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

public enum AutomationCategory { Cobranza = 0, Ventas = 1, Inventario = 2, Operacion = 3 }
public enum AutomationTriggerType { Event = 0, Cron = 1, Condition = 2 }
public enum AutomationActionType { Notification = 0, Email = 1, CreateEntity = 2 }
public enum AutomationTier { Free = 0, Premium = 1 }

[Table("AutomationTemplates")]
public class AutomationTemplate
{
    [Column("id")]
    public int Id { get; set; }

    [Column("slug")]
    [MaxLength(50)]
    public string Slug { get; set; } = "";

    [Column("nombre")]
    [MaxLength(100)]
    public string Nombre { get; set; } = "";

    [Column("descripcion")]
    [MaxLength(500)]
    public string Descripcion { get; set; } = "";

    [Column("descripcion_corta")]
    [MaxLength(200)]
    public string DescripcionCorta { get; set; } = "";

    [Column("icono")]
    [MaxLength(50)]
    public string Icono { get; set; } = "";

    [Column("categoria")]
    public AutomationCategory Categoria { get; set; }

    [Column("trigger_type")]
    public AutomationTriggerType TriggerType { get; set; }

    [Column("trigger_event")]
    [MaxLength(100)]
    public string? TriggerEvent { get; set; }

    [Column("trigger_cron")]
    [MaxLength(50)]
    public string? TriggerCron { get; set; }

    [Column("action_type")]
    public AutomationActionType ActionType { get; set; }

    [Column("default_params_json")]
    public string? DefaultParamsJson { get; set; }

    [Column("tier")]
    public AutomationTier Tier { get; set; } = AutomationTier.Free;

    [Column("orden")]
    public int Orden { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<TenantAutomation> TenantAutomations { get; set; } = new List<TenantAutomation>();
}
