using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

/// <summary>
/// Linea individual de una DevolucionPedido. Linked al DetallePedido original
/// (cuando esta disponible) para tracking de devoluciones parciales por linea.
/// CASCADE on parent delete.
/// </summary>
[Table("DetalleDevoluciones")]
public class DetalleDevolucion : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("mobile_record_id")]
    public string? MobileRecordId { get; set; }

    [Column("devolucion_id")]
    public int DevolucionId { get; set; }

    /// <summary>Link a la linea original del pedido. Permite calcular cantidad_devuelta acumulada por linea.</summary>
    [Column("detalle_pedido_id")]
    public int? DetallePedidoId { get; set; }

    [Column("producto_id")]
    public int ProductoId { get; set; }

    [Column("cantidad")]
    public decimal Cantidad { get; set; }

    [Column("precio_unitario")]
    public decimal PrecioUnitario { get; set; }

    [Column("subtotal")]
    public decimal Subtotal { get; set; }

    [Column("impuesto")]
    public decimal Impuesto { get; set; }

    [Column("total")]
    public decimal Total { get; set; }

    // Navigation properties
    public DevolucionPedido Devolucion { get; set; } = null!;
    public DetallePedido? DetallePedido { get; set; }
    public Producto Producto { get; set; } = null!;
}
