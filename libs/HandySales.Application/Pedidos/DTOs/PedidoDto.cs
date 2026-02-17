using HandySales.Domain.Entities;

namespace HandySales.Application.Pedidos.DTOs;

public class PedidoDto
{
    public int Id { get; set; }
    public required string NumeroPedido { get; set; }
    public int ClienteId { get; set; }
    public required string ClienteNombre { get; set; }
    public int UsuarioId { get; set; }
    public required string UsuarioNombre { get; set; }
    public DateTime FechaPedido { get; set; }
    public DateTime? FechaEntregaEstimada { get; set; }
    public DateTime? FechaEntregaReal { get; set; }
    public EstadoPedido Estado { get; set; }
    public string EstadoNombre => Estado.ToString();
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuestos { get; set; }
    public decimal Total { get; set; }
    public string? Notas { get; set; }
    public string? DireccionEntrega { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public int? ListaPrecioId { get; set; }
    public string? ListaPrecioNombre { get; set; }
    public List<DetallePedidoDto> Detalles { get; set; } = new();
    public DateTime CreadoEn { get; set; }
    public DateTime? ActualizadoEn { get; set; }
}
