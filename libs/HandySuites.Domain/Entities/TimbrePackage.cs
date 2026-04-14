using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

[Table("timbre_packages")]
public class TimbrePackage
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("nombre")]
    [MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;

    [Column("cantidad")]
    public int Cantidad { get; set; }

    [Column("precio_mxn", TypeName = "decimal(10,2)")]
    public decimal PrecioMxn { get; set; }

    [Column("precio_unitario", TypeName = "decimal(10,2)")]
    public decimal PrecioUnitario { get; set; }

    [Column("stripe_price_id")]
    [MaxLength(100)]
    public string? StripePriceId { get; set; }

    /// <summary>
    /// Translation key for badge label (e.g., "mostPopular", "bestValue").
    /// Frontend resolves via useTranslations('subscription.buyTimbres').
    /// </summary>
    [Column("badge")]
    [MaxLength(30)]
    public string? Badge { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("orden")]
    public int Orden { get; set; }
}
