using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("subscription_plans")]
public class SubscriptionPlan
{
    [Column("id")]
    public int Id { get; set; }

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Column("codigo")]
    public string Codigo { get; set; } = string.Empty;

    [Column("precio_mensual")]
    public decimal PrecioMensual { get; set; }

    [Column("precio_anual")]
    public decimal PrecioAnual { get; set; }

    [Column("max_usuarios")]
    public int MaxUsuarios { get; set; }

    [Column("max_productos")]
    public int MaxProductos { get; set; }

    [Column("max_clientes_por_mes")]
    public int MaxClientesPorMes { get; set; }

    [Column("incluye_reportes")]
    public bool IncluyeReportes { get; set; }

    [Column("incluye_soporte_prioritario")]
    public bool IncluyeSoportePrioritario { get; set; }

    [Column("stripe_price_id_mensual")]
    public string? StripePriceIdMensual { get; set; }

    [Column("stripe_price_id_anual")]
    public string? StripePriceIdAnual { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("orden")]
    public int Orden { get; set; }
}
