namespace HandySales.Application.Precios.DTOs;

public class PrecioPorProductoDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public int ListaPrecioId { get; set; }
    public decimal Precio { get; set; }
}
