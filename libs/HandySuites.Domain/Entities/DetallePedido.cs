using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("DetallePedidos")]
public class DetallePedido : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("mobile_record_id")]
    public string? MobileRecordId { get; set; }

    [Column("pedido_id")]
    public int PedidoId { get; set; }

    [Column("producto_id")]
    public int ProductoId { get; set; }

    [Column("cantidad")]
    public decimal Cantidad { get; set; }

    [Column("precio_unitario")]
    public decimal PrecioUnitario { get; set; }

    [Column("descuento")]
    public decimal Descuento { get; set; }

    [Column("porcentaje_descuento")]
    public decimal PorcentajeDescuento { get; set; }

    [Column("subtotal")]
    public decimal Subtotal { get; set; }

    [Column("impuesto")]
    public decimal Impuesto { get; set; }

    [Column("total")]
    public decimal Total { get; set; }

    [Column("notas")]
    public string? Notas { get; set; }

    /// <summary>
    /// Cantidad de unidades de esta línea que fueron regaladas por una promoción
    /// tipo Regalo (BOGO). Cuando &gt; 0, `Descuento` ya incluye el monto equivalente
    /// (cantidadBonificada * precioUnitario). Drives CFDI XML — cuando es mismo
    /// producto, se emite con descuento; cuando es producto distinto, esta línea
    /// es la auto-insertada por el servidor con descuento 100%.
    /// Default 0 → pedidos pre-feature no se afectan.
    /// </summary>
    [Column("cantidad_bonificada")]
    public decimal CantidadBonificada { get; set; } = 0m;

    // Navigation properties
    public Pedido Pedido { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
}
