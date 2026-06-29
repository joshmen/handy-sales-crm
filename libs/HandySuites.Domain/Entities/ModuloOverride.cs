using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("ModulosOverride")]
public class ModuloOverride : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("modulo_plataforma_id")]
    public int ModuloPlataformaId { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("habilitado")]
    public bool Habilitado { get; set; }

    [Column("motivo")]
    public string? Motivo { get; set; }
}
