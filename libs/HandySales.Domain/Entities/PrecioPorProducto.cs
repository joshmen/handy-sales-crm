using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

[Table("PreciosPorProducto")]
public class PrecioPorProducto : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("producto_id")]
    public int ProductoId { get; set; }
    [Column("lista_precio_id")]
    public int ListaPrecioId { get; set; }
    [Column("precio")]
    public decimal Precio { get; set; }

    public Producto Producto { get; set; } = null!;
    public ListaPrecio ListaPrecio { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
