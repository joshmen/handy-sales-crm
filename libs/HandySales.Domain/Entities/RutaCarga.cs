using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("RutasCarga")]
public class RutaCarga : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("ruta_id")]
    public int RutaId { get; set; }

    [Column("producto_id")]
    public int ProductoId { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("cantidad_entrega")]
    public int CantidadEntrega { get; set; }

    [Column("cantidad_venta")]
    public int CantidadVenta { get; set; }

    [Column("cantidad_total")]
    public int CantidadTotal { get; set; }

    [Column("precio_unitario")]
    public double PrecioUnitario { get; set; }

    // Navigation properties
    public RutaVendedor Ruta { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
