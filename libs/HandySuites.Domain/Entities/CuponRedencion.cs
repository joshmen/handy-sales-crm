using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("CuponRedenciones")]
public class CuponRedencion : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("cupon_id")]
    public int CuponId { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("fecha_redencion")]
    public DateTime FechaRedencion { get; set; } = DateTime.UtcNow;

    [Column("beneficio_aplicado")]
    public string BeneficioAplicado { get; set; } = string.Empty;

    public Cupon Cupon { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
