using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("Promociones")]
public class Promocion : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;
    [Column("descripcion")]
    public string Descripcion { get; set; } = string.Empty;
    [Column("descuento_porcentaje")]
    public decimal DescuentoPorcentaje { get; set; }
    [Column("fecha_inicio")]
    public DateTime FechaInicio { get; set; }
    [Column("fecha_fin")]
    public DateTime FechaFin { get; set; }

    /// <summary>
    /// Tipo de promoción. Porcentaje (default, comportamiento legacy) o Regalo
    /// (BOGO acumulativo). Cuando Regalo, los campos CantidadCompra/CantidadBonificada
    /// dictan la regla y DescuentoPorcentaje queda en 0 e ignorado.
    /// </summary>
    [Column("tipo_promocion")]
    public TipoPromocion TipoPromocion { get; set; } = TipoPromocion.Porcentaje;

    /// <summary>Cantidad de unidades a comprar para gatillar el regalo (ej: 10).</summary>
    [Column("cantidad_compra")]
    public decimal? CantidadCompra { get; set; }

    /// <summary>Cantidad de unidades regaladas por cada CantidadCompra (ej: 1).</summary>
    [Column("cantidad_bonificada")]
    public decimal? CantidadBonificada { get; set; }

    /// <summary>
    /// FK al producto bonificado. NULL = se regala el mismo producto que se compra.
    /// Si != null se bonifica un producto distinto (ej: compra 10 X regala 1 Y).
    /// </summary>
    [Column("producto_bonificado_id")]
    public int? ProductoBonificadoId { get; set; }

    [ForeignKey(nameof(ProductoBonificadoId))]
    public Producto? ProductoBonificado { get; set; }

    public List<PromocionProducto> PromocionProductos { get; set; } = new();
    public Tenant Tenant { get; set; } = null!;
}
