using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum TipoNovedad
{
    Nuevo = 0,
    Mejora = 1,
    Fix = 2
}

public enum EstadoNovedad
{
    Borrador = 0,
    Publicado = 1
}

[Table("Novedades")]
public class Novedad : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("version_etiqueta")]
    public string VersionEtiqueta { get; set; } = string.Empty;

    [Column("tipo")]
    public TipoNovedad Tipo { get; set; }

    [Column("fecha")]
    public DateTime Fecha { get; set; }

    [Column("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [Column("descripcion")]
    public string Descripcion { get; set; } = string.Empty;

    [Column("audiencia")]
    public string? Audiencia { get; set; }

    [Column("estado")]
    public EstadoNovedad Estado { get; set; }
}
