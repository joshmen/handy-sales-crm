using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("PromocionProductos")]
public class PromocionProducto
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("promocion_id")]
    public int PromocionId { get; set; }
    [Column("producto_id")]
    public int ProductoId { get; set; }
    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    public Promocion Promocion { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
}
