using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

[Table("ai_usage_logs")]
public class AiUsageLog
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("tipo_accion")]
    [Required]
    [MaxLength(30)]
    public string TipoAccion { get; set; } = string.Empty;

    [Column("creditos_cobrados")]
    public int CreditosCobrados { get; set; }

    [Column("prompt")]
    [MaxLength(2000)]
    public string Prompt { get; set; } = string.Empty;

    [Column("modelo_usado")]
    [MaxLength(50)]
    public string ModeloUsado { get; set; } = string.Empty;

    [Column("tokens_input")]
    public int TokensInput { get; set; }

    [Column("tokens_output")]
    public int TokensOutput { get; set; }

    [Column("costo_estimado_usd", TypeName = "decimal(8,4)")]
    public decimal CostoEstimadoUsd { get; set; }

    [Column("latencia_ms")]
    public int LatenciaMs { get; set; }

    [Column("exitoso")]
    public bool Exitoso { get; set; }

    [Column("error_message")]
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    [ForeignKey("TenantId")]
    public virtual Tenant? Tenant { get; set; }

    [ForeignKey("UsuarioId")]
    public virtual Usuario? Usuario { get; set; }
}
