using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("ModulosPlataforma")]
public class ModuloPlataforma : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("clave")]
    public string Clave { get; set; } = string.Empty;

    [Column("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("disponible_basico")]
    public bool DisponibleBasico { get; set; }

    [Column("disponible_pro")]
    public bool DisponiblePro { get; set; }

    [Column("disponible_enterprise")]
    public bool DisponibleEnterprise { get; set; }

    [Column("orden")]
    public int Orden { get; set; }

    public ICollection<ModuloOverride> Overrides { get; set; } = new List<ModuloOverride>();
}
