namespace HandySales.Application.Inventario.DTOs;

public class InventarioUpdateDto
{
    public decimal CantidadActual { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal StockMaximo { get; set; }
}
