using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

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

    public List<PromocionProducto> PromocionProductos { get; set; } = new();
    public Tenant Tenant { get; set; } = null!;
}
