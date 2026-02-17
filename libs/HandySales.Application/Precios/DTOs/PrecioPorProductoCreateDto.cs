namespace HandySales.Application.Precios.DTOs;

public class PrecioPorProductoCreateDto
{
    public int TenandId { get; set; }
    public int ProductoId { get; set; }
    public int ListaPrecioId { get; set; }
    public decimal Precio { get; set; }
}
