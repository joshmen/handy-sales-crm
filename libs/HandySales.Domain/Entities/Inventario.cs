using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("Inventario")]
public class Inventario : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("producto_id")]
    public int ProductoId { get; set; }
    [Column("cantidad_actual")]
    public decimal CantidadActual { get; set; }
    [Column("stock_minimo")]
    public decimal StockMinimo { get; set; }
    [Column("stock_maximo")]
    public decimal StockMaximo { get; set; }

    public Producto Producto { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
