namespace HandySales.Application.Pedidos.DTOs;

public class PedidoCreateDto
{
    public int ClienteId { get; set; }
    public DateTime? FechaEntregaEstimada { get; set; }
    public string? Notas { get; set; }
    public string? DireccionEntrega { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public int? ListaPrecioId { get; set; }
    public List<DetallePedidoCreateDto> Detalles { get; set; } = new();
}

public class DetallePedidoCreateDto
{
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal? PrecioUnitario { get; set; }
    public decimal? Descuento { get; set; }
    public decimal? PorcentajeDescuento { get; set; }
    public string? Notas { get; set; }
}
