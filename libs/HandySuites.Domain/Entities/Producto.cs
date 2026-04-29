using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("Productos")]
public class Producto : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("nombre")]
    public string Nombre { get; set; } = null!;
    [Column("codigo_barra")]
    public string CodigoBarra { get; set; } = null!;
    [Column("descripcion")]
    public string Descripcion { get; set; } = null!;
    [Column("imagen_url")]
    public string? ImagenUrl { get; set; }
    [Column("familia_id")]
    public int FamiliaId { get; set; }
    [Column("categoria_id")]
    public int CategoraId { get; set; }
    [Column("unidad_medida_id")]
    public int UnidadMedidaId { get; set; }
    [Column("precio_base")]
    public decimal PrecioBase { get; set; }

    [Column("clave_sat")]
    public string? ClaveSat { get; set; }

    /// <summary>
    /// Si true (default), `PrecioBase` es lo que el cliente paga al final (IVA
    /// incluido). El sistema desglosa la base sin impuesto al calcular pedidos.
    /// Si false, `PrecioBase` es base sin IVA y el sistema agrega el impuesto al
    /// cobrar. Reportado 2026-04-28: tickets cobraban de más sumando IVA cuando
    /// el admin registraba precios finales.
    /// </summary>
    [Column("precio_incluye_iva")]
    public bool PrecioIncluyeIva { get; set; } = true;

    /// <summary>
    /// FK al catálogo TasasImpuesto. Si null, el cálculo cae a la tasa marcada
    /// EsDefault del tenant. Permite cambiar la tasa central sin tocar productos.
    /// </summary>
    [Column("tasa_impuesto_id")]
    public int? TasaImpuestoId { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;

    [ForeignKey(nameof(FamiliaId))]
    public FamiliaProducto Familia { get; set; } = null!;

    [ForeignKey(nameof(CategoraId))]
    public CategoriaProducto Categoria { get; set; } = null!;

    [ForeignKey(nameof(UnidadMedidaId))]
    public UnidadMedida UnidadMedida { get; set; } = null!;

    [ForeignKey(nameof(TasaImpuestoId))]
    public TasaImpuesto? TasaImpuesto { get; set; }

    // Inventario (one-to-one per tenant)
    public Inventario? Inventario { get; set; }
}
