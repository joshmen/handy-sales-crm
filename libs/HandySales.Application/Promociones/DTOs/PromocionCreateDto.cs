namespace HandySales.Application.Promociones.DTOs;

public class PromocionCreateDto
{
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public List<int> ProductoIds { get; set; } = new();
    public decimal DescuentoPorcentaje { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
}
