using HandySuites.Domain.Entities;

namespace HandySuites.Application.SystemStatus.DTOs;

public class IncidenteDto
{
    public int Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Componente { get; set; } = string.Empty;
    public SeveridadIncidente Severidad { get; set; }
    public EstadoIncidente Estado { get; set; }
    public DateTime IniciadoEn { get; set; }
    public DateTime? ResueltoEn { get; set; }
    public List<IncidenteActualizacionDto> Actualizaciones { get; set; } = new();
}

public class IncidenteActualizacionDto
{
    public int Id { get; set; }
    public int IncidenteId { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public EstadoIncidente Estado { get; set; }
    public DateTime CreadoEn { get; set; }
}

public record CrearIncidenteDto(
    string Titulo,
    string Componente,
    SeveridadIncidente Severidad,
    EstadoIncidente Estado,
    string? MensajeInicial
);

public record CrearActualizacionDto(
    string Mensaje,
    EstadoIncidente Estado
);

public class SaludServicioDto
{
    public string Nombre { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string Detalle { get; set; } = string.Empty;
}
