using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Billing.Api.Models;

/// <summary>
/// SAT c_ClaveProdServ catalog (~53K entries for Mexico).
/// Country-aware: pais field supports future LATAM expansion (CO, PE, AR).
/// </summary>
public class CatalogoProdServ
{
    [Key]
    [MaxLength(10)]
    public string Clave { get; set; } = default!;

    [Required]
    public string Descripcion { get; set; } = default!;

    [MaxLength(5)]
    public string Pais { get; set; } = "MX";

    public bool Activo { get; set; } = true;
}

/// <summary>
/// SAT c_ClaveUnidad catalog (~1.8K entries for Mexico).
/// Country-aware: pais field supports future LATAM expansion.
/// </summary>
public class CatalogoUnidad
{
    [Key]
    [MaxLength(10)]
    public string Clave { get; set; } = default!;

    [Required]
    public string Nombre { get; set; } = default!;

    [MaxLength(5)]
    public string Pais { get; set; } = "MX";

    public bool Activo { get; set; } = true;
}

/// <summary>
/// Per-tenant mapping of CRM products to fiscal catalog codes.
/// Authoritative source for invoice line items — takes precedence over Producto.ClaveSat.
/// </summary>
public class MapeoFiscalProducto
{
    [Key]
    public long Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string TenantId { get; set; } = default!;

    public int ProductoId { get; set; }

    [Required]
    [MaxLength(10)]
    public string ClaveProdServ { get; set; } = default!;

    [Required]
    [MaxLength(10)]
    public string ClaveUnidad { get; set; } = default!;

    /// <summary>Optional override for the product description on the invoice.</summary>
    [MaxLength(500)]
    public string? DescripcionFiscal { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Tenant-level default fiscal codes — used as fallback when a product has no explicit mapping.
/// </summary>
public class DefaultsFiscalesTenant
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string TenantId { get; set; } = default!;

    [MaxLength(10)]
    public string ClaveProdServDefault { get; set; } = "01010101";

    [MaxLength(10)]
    public string ClaveUnidadDefault { get; set; } = "H87";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
