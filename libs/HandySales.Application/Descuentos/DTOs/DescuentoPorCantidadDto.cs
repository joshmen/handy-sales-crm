namespace HandySales.Application.Descuentos.DTOs;

public class DescuentoPorCantidadDto
{
    public int Id { get; set; }
    public int? ProductoId { get; set; }  // Nullable para descuentos globales
    public string? ProductoNombre { get; set; }
    public string? ProductoCodigo { get; set; }
    public decimal CantidadMinima { get; set; }
    public decimal DescuentoPorcentaje { get; set; }
    public string TipoAplicacion { get; set; } = "Producto";
    public bool Activo { get; set; }
    public DateTime CreadoEn { get; set; }
    public string? CreadoPor { get; set; }
    public DateTime? ActualizadoEn { get; set; }
    public string? ActualizadoPor { get; set; }
}
