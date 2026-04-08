using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

[Table("ai_credit_balances")]
public class AiCreditBalance
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("anio")]
    public int Anio { get; set; }

    [Column("mes")]
    public int Mes { get; set; }

    [Column("creditos_asignados")]
    public int CreditosAsignados { get; set; }

    [Column("creditos_usados")]
    public int CreditosUsados { get; set; }

    [Column("creditos_extras")]
    public int CreditosExtras { get; set; }

    [Column("fecha_reset")]
    public DateTime FechaReset { get; set; }

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    [Column("actualizado_en")]
    public DateTime? ActualizadoEn { get; set; }

    [ForeignKey("TenantId")]
    public virtual Tenant? Tenant { get; set; }
}
