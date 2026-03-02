namespace HandySales.Application.Automations.DTOs;

// ═══════════════════════════════════════════════════════
// READ DTOs
// ═══════════════════════════════════════════════════════

public class AutomationTemplateDto
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string DescripcionCorta { get; set; } = "";
    public string Icono { get; set; } = "";
    public string Categoria { get; set; } = "";
    public string TriggerType { get; set; } = "";
    public string ActionType { get; set; } = "";
    public string Tier { get; set; } = "";
    public int Orden { get; set; }

    // Per-tenant status
    public bool Activada { get; set; }
    public string? ParamsJson { get; set; }
    public string? DefaultParamsJson { get; set; }
    public DateTime? UltimaEjecucion { get; set; }
    public int TotalEjecuciones { get; set; }
}

public class AutomationExecutionDto
{
    public long Id { get; set; }
    public string TemplateSlug { get; set; } = "";
    public string TemplateNombre { get; set; } = "";
    public string? TriggerEntity { get; set; }
    public int? TriggerEntityId { get; set; }
    public string Status { get; set; } = "";
    public string ActionTaken { get; set; } = "";
    public string? ErrorMessage { get; set; }
    public DateTime EjecutadoEn { get; set; }
}

// ═══════════════════════════════════════════════════════
// WRITE DTOs
// ═══════════════════════════════════════════════════════

public record ActivarAutomationRequest(string? ParamsJson);
public record ConfigurarAutomationRequest(string ParamsJson);
