namespace HandySuites.Application.Metas.DTOs;

public class MetaVendedorDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Periodo { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public bool Activo { get; set; }
    public DateTime CreadoEn { get; set; }
    public bool AutoRenovar { get; set; }
}

public record CreateMetaVendedorDto(
    int UsuarioId,
    string Tipo,
    string Periodo,
    decimal Monto,
    DateTime FechaInicio,
    DateTime FechaFin,
    bool AutoRenovar = false
);

public record UpdateMetaVendedorDto(
    string Tipo,
    string Periodo,
    decimal Monto,
    DateTime FechaInicio,
    DateTime FechaFin,
    bool Activo,
    bool AutoRenovar = false
);
