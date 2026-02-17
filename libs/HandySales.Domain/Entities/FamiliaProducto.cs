using HandySales.Domain.Common;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("FamiliasProductos")]
public class FamiliaProducto : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;
    [Column("descripcion")]
    public string Descripcion { get; set; } = string.Empty;

    public Tenant Tenant { get; set; } = null!;
}
