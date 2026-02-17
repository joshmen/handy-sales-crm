using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("MovimientosInventario")]
public class MovimientoInventario : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("producto_id")]
    public int ProductoId { get; set; }

    [Column("tipo_movimiento")]
    public string TipoMovimiento { get; set; } = null!; // ENTRADA, SALIDA, AJUSTE

    [Column("cantidad")]
    public decimal Cantidad { get; set; }

    [Column("cantidad_anterior")]
    public decimal CantidadAnterior { get; set; }

    [Column("cantidad_nueva")]
    public decimal CantidadNueva { get; set; }

    [Column("motivo")]
    public string? Motivo { get; set; } // COMPRA, VENTA, DEVOLUCION, AJUSTE_INVENTARIO, MERMA, TRANSFERENCIA

    [Column("comentario")]
    public string? Comentario { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("referencia_id")]
    public int? ReferenciaId { get; set; } // ID de pedido, compra, etc.

    [Column("referencia_tipo")]
    public string? ReferenciaTipo { get; set; } // PEDIDO, COMPRA, AJUSTE_MANUAL

    public Producto Producto { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
