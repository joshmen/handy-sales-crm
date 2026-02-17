namespace HandySales.Application.Descuentos.DTOs;

public class DescuentoPorCantidadCreateDto
{
    public int? ProductoId { get; set; }  // Nullable para descuentos globales
    public decimal CantidadMinima { get; set; }
    public decimal DescuentoPorcentaje { get; set; }
    public string TipoAplicacion { get; set; } = "Producto";
    public int TenantId { get; set; }
}
