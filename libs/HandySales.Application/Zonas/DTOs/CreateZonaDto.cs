namespace HandySales.Application.Zonas.DTOs;

public class CreateZonaDto
{
    public int TenandId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
}