using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("Tenants")]
public class Tenant : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("nombre_empresa")]
    public string NombreEmpresa { get; set; } = string.Empty;
    [Column("cloudinary_folder")]
    public string? CloudinaryFolder { get; set; }

    // Suscripción
    [Column("plan_tipo")]
    public string? PlanTipo { get; set; }
    [Column("max_usuarios")]
    public int MaxUsuarios { get; set; } = 10;
    [Column("fecha_suscripcion")]
    public DateTime? FechaSuscripcion { get; set; }
    [Column("fecha_expiracion")]
    public DateTime? FechaExpiracion { get; set; }

    // Stripe
    [Column("stripe_customer_id")]
    public string? StripeCustomerId { get; set; }
    [Column("stripe_subscription_id")]
    public string? StripeSubscriptionId { get; set; }
    [Column("stripe_price_id")]
    public string? StripePriceId { get; set; }

    // Estado de suscripción
    [Column("subscription_status")]
    public string SubscriptionStatus { get; set; } = "Trial";
    [Column("grace_period_end")]
    public DateTime? GracePeriodEnd { get; set; }
    [Column("cancelled_at")]
    public DateTime? CancelledAt { get; set; }
    [Column("cancellation_reason")]
    public string? CancellationReason { get; set; }

    // Relaciones
    public DatosEmpresa? DatosEmpresa { get; set; }
    public ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
    public ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();
    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
    public ICollection<Inventario> Inventarios { get; set; } = new List<Inventario>();
    public ICollection<Promocion> Promociones { get; set; } = new List<Promocion>();
    public ICollection<DescuentoPorCantidad> DescuentosPorCantidad { get; set; } = new List<DescuentoPorCantidad>();
    public ICollection<ListaPrecio> ListasPrecios { get; set; } = new List<ListaPrecio>();
}
