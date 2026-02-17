using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("DescuentosPorCantidad")]
public class DescuentoPorCantidad : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("producto_id")]
    public int? ProductoId { get; set; }  // Nullable para descuentos globales
    [Column("cantidad_minima")]
    public decimal CantidadMinima { get; set; }
    [Column("descuento_porcentaje")]
    public decimal DescuentoPorcentaje { get; set; }
    [Column("tipo_aplicacion")]
    public string TipoAplicacion { get; set; } = "Producto"; // 'Producto' o 'Global'

    public Producto? Producto { get; set; }  // Nullable para descuentos globales
    public Tenant Tenant { get; set; } = null!;
}
