using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Per-tenant integration activation record.
/// </summary>
[Table("TenantIntegrations")]
public class TenantIntegration : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("integration_id")]
    public int IntegrationId { get; set; }

    [Column("estado")]
    public string Estado { get; set; } = "ACTIVA"; // ACTIVA, SUSPENDIDA, CANCELADA

    [Column("fecha_activacion")]
    public DateTime FechaActivacion { get; set; } = DateTime.UtcNow;

    [Column("activado_por")]
    public int? ActivadoPorUsuarioId { get; set; }

    [Column("configuracion")]
    public string? Configuracion { get; set; } // jsonb

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public Integration Integration { get; set; } = null!;
}
