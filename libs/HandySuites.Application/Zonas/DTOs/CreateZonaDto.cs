using HandySuites.Domain.Entities;

namespace HandySuites.Application.Zonas.DTOs;

public class CreateZonaDto
{
    public int TenandId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public double? CentroLatitud { get; set; }
    public double? CentroLongitud { get; set; }
    public double? RadioKm { get; set; }
    public int? VendedorId { get; set; }
    public string? Color { get; set; }
    public FrecuenciaVisita FrecuenciaVisita { get; set; } = FrecuenciaVisita.Semanal;
}
