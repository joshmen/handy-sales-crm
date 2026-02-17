namespace HandySales.Application.Inventario.DTOs;

public class InventarioCreateDto
{
    public int TenantId { get; set; }
    public int ProductoId { get; set; }
    public decimal CantidadActual { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal StockMaximo { get; set; }
}
