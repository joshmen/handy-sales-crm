using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum SeveridadIncidente
{
    Menor = 0,
    Mayor = 1,
    Critico = 2
}

public enum EstadoIncidente
{
    Investigando = 0,
    Identificado = 1,
    Monitoreando = 2,
    Resuelto = 3
}

[Table("Incidentes")]
public class Incidente : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [Column("componente")]
    public string Componente { get; set; } = string.Empty;

    [Column("severidad")]
    public SeveridadIncidente Severidad { get; set; }

    [Column("estado")]
    public EstadoIncidente Estado { get; set; }

    [Column("iniciado_en")]
    public DateTime IniciadoEn { get; set; } = DateTime.UtcNow;

    [Column("resuelto_en")]
    public DateTime? ResueltoEn { get; set; }

    public ICollection<IncidenteActualizacion> Actualizaciones { get; set; } = new List<IncidenteActualizacion>();
}
