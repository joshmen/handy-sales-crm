namespace HandySales.Application.Pedidos.DTOs;

public class DetallePedidoDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public required string ProductoNombre { get; set; }
    public string? ProductoSku { get; set; }
    public string? ProductoImagen { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal PorcentajeDescuento { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
    public string? Notas { get; set; }
}
