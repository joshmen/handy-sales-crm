using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

/// <summary>
/// Global integration catalog — not tenant-scoped.
/// </summary>
[Table("Integrations")]
public class Integration : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("slug")]
    public string Slug { get; set; } = string.Empty;

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("icono")]
    public string? Icono { get; set; }

    [Column("categoria")]
    public string Categoria { get; set; } = string.Empty;

    [Column("tipo_precio")]
    public string TipoPrecio { get; set; } = "GRATIS"; // PERMANENTE, MENSUAL, GRATIS

    [Column("precio_mxn")]
    public decimal PrecioMXN { get; set; }

    [Column("estado")]
    public string Estado { get; set; } = "DISPONIBLE"; // DISPONIBLE, PROXIMO, DESCONTINUADO

    // Navigation
    public ICollection<TenantIntegration> TenantIntegrations { get; set; } = new List<TenantIntegration>();
}
