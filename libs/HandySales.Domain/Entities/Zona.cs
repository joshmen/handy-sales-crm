using HandySuites.Domain.Common;
using System.ComponentModel.DataAnnotations.Schema;

namespace HandySuites.Domain.Entities;

[Table("Zonas")]
public class Zona : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }
    [Column("tenant_id")]
    public int TenantId { get; set; }
    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;
    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("centro_latitud")]
    public double? CentroLatitud { get; set; }

    [Column("centro_longitud")]
    public double? CentroLongitud { get; set; }

    [Column("radio_km")]
    public double? RadioKm { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
