using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

[Table("TimbrePurchases")]
public class TimbrePurchase
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("cantidad")]
    public int Cantidad { get; set; }

    [Column("precio_mxn", TypeName = "decimal(10,2)")]
    public decimal PrecioMxn { get; set; }

    [Column("stripe_checkout_session_id")]
    [MaxLength(100)]
    public string? StripeCheckoutSessionId { get; set; }

    [Column("stripe_payment_intent_id")]
    [MaxLength(100)]
    public string? StripePaymentIntentId { get; set; }

    [Column("estado")]
    [Required]
    [MaxLength(20)]
    public string Estado { get; set; } = "pendiente";

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    [Column("completado_en")]
    public DateTime? CompletadoEn { get; set; }

    [ForeignKey("TenantId")]
    public virtual Tenant? Tenant { get; set; }
}
