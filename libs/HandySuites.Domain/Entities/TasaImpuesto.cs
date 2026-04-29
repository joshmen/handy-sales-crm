using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Catálogo de tasas de impuesto por tenant. Cada tenant tiene N tasas (IVA 16%,
/// Frontera 8%, Tasa Cero, etc.) y cada producto referencia una. Permite cambiar
/// la tasa central sin tocar productos individuales (ej. SAT eleva IVA a 18%).
/// El sistema es multi-país (LatAm); para timbrado CFDI los metadatos SAT
/// (TipoImpuesto Traslado/Retención, ClaveSAT 002/003) se derivan en el builder
/// XML cuando companySettings.country='MX', no se guardan en el catálogo.
/// </summary>
[Table("TasasImpuesto")]
public class TasaImpuesto : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    /// <summary>
    /// Tasa expresada como decimal — 0.16 = 16%, 0.08 = 8%, 0.00 = exento.
    /// </summary>
    [Column("tasa")]
    public decimal Tasa { get; set; }

    /// <summary>
    /// Solo una tasa por tenant puede tener EsDefault=true. Se aplica a productos
    /// que no especifican TasaImpuestoId. Service valida la unicidad.
    /// </summary>
    [Column("es_default")]
    public bool EsDefault { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public List<Producto> Productos { get; set; } = new();
}
