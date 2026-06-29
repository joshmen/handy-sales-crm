using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("IncidenteActualizaciones")]
public class IncidenteActualizacion : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("incidente_id")]
    public int IncidenteId { get; set; }

    [Column("mensaje")]
    public string Mensaje { get; set; } = string.Empty;

    [Column("estado")]
    public EstadoIncidente Estado { get; set; }
}
