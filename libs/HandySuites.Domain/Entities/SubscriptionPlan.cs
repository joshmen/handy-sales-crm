using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

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

    [Column("caracteristicas")]
    public List<string> Caracteristicas { get; set; } = new();

    [Column("stripe_price_id_mensual")]
    public string? StripePriceIdMensual { get; set; }

    [Column("stripe_price_id_anual")]
    public string? StripePriceIdAnual { get; set; }

    [Column("max_timbres_mes")]
    public int MaxTimbresMes { get; set; }

    // Facturación CFDI (solo MX)
    [Column("incluye_facturacion")]
    public bool IncluyeFacturacion { get; set; }

    /// <summary>
    /// Tracking GPS continuo de vendedores (ping cada 15min + por evento).
    /// Mobile envía pings solo si el plan del tenant lo incluye; backend
    /// rechaza con 403 si el plan no aplica. Por costo de DB y bandwidth.
    /// </summary>
    [Column("incluye_tracking_vendedor")]
    public bool IncluyeTrackingVendedor { get; set; }

    [Column("max_facturas_mes")]
    public int MaxFacturasMes { get; set; }

    [Column("costo_extra_factura_bloque")]
    public decimal CostoExtraFacturaBloque { get; set; }

    [Column("tamano_bloque_facturas")]
    public int TamanoBloqueFacturas { get; set; } = 100;

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("orden")]
    public int Orden { get; set; }

    /// <summary>
    /// Sesiones concurrentes permitidas por usuario en mobile (Netflix-style).
    /// Default 1 (mantiene compat con regla histórica "1 vendedor = 1 device").
    /// Plans más altos pueden permitir más (BUSINESS=10 ej.).
    /// Cuando user intenta login y ya tiene N sesiones activas, el comportamiento
    /// depende de <see cref="ForceSingleSession"/>: con true bloquea el nuevo login
    /// (409 SESSION_BLOCKED), con false abre picker para revocar (200 SESSION_LIMIT_REACHED).
    /// </summary>
    [Column("max_concurrent_sessions")]
    public int MaxConcurrentSessions { get; set; } = 1;

    /// <summary>
    /// Política estricta de sesión única. Cuando true, si el usuario ya tiene
    /// <see cref="MaxConcurrentSessions"/> sesiones activas y intenta loguearse
    /// en un device nuevo, el backend bloquea el nuevo login con 409
    /// SESSION_BLOCKED — el device existente NO se ve afectado y el user debe
    /// cerrar sesión manualmente en él (o el admin via /dispositivos/admin).
    ///
    /// Cuando false (default), mantiene comportamiento Netflix-style: backend
    /// retorna 200 + SESSION_LIMIT_REACHED + lista de sesiones activas, mobile
    /// muestra picker en /(auth)/session-limit donde el user elige cuál revocar
    /// para entrar (atomic via /revoke-and-login).
    ///
    /// Fix prod 2026-06-04: default false porque la UX Netflix-style permite al
    /// vendedor genuino cambiar de cel sin fricción. El bloqueo estricto se
    /// activa solo para plans que opten in (config en panel SuperAdmin).
    /// </summary>
    [Column("force_single_session")]
    public bool ForceSingleSession { get; set; } = false;

    // Navigation
    public virtual ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
}
