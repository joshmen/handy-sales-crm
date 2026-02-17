using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("DetallePedidos")]
public class DetallePedido : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

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

    // Navigation properties
    public Pedido Pedido { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
}
