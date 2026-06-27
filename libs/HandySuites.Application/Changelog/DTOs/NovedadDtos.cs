using HandySuites.Domain.Entities;

namespace HandySuites.Application.Changelog.DTOs;

public class NovedadDto
{
    public int Id { get; set; }
    public string VersionEtiqueta { get; set; } = string.Empty;
    public TipoNovedad Tipo { get; set; }
    public DateTime Fecha { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string? Audiencia { get; set; }
    public EstadoNovedad Estado { get; set; }
    public bool Activo { get; set; }
    public DateTime CreadoEn { get; set; }
    public DateTime? ActualizadoEn { get; set; }
}

public record CrearNovedadDto(
    string VersionEtiqueta,
    TipoNovedad Tipo,
    DateTime Fecha,
    string Titulo,
    string Descripcion,
    string? Audiencia,
    EstadoNovedad Estado
);

public record ActualizarNovedadDto(
    string VersionEtiqueta,
    TipoNovedad Tipo,
    DateTime Fecha,
    string Titulo,
    string Descripcion,
    string? Audiencia,
    EstadoNovedad Estado
);
