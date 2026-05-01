using HandySuites.Domain.Entities;

namespace HandySuites.Application.Pedidos.DTOs;

public class PedidoCreateDto
{
    public int ClienteId { get; set; }
    public TipoVenta TipoVenta { get; set; } = TipoVenta.Preventa;
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
    /// <summary>
    /// Sugerencia del cliente sobre cuántas unidades son regaladas (BOGO). El servidor
    /// valida y recalcula contra la promoción real para evitar manipulación —
    /// nunca confía ciegamente en este valor. Default 0.
    /// </summary>
    public decimal? CantidadBonificada { get; set; }
    /// <summary>
    /// FK opcional a la promoción aplicada. Si presente, el servidor verifica
    /// vigencia y elegibilidad del producto antes de bonificar.
    /// </summary>
    public int? PromocionId { get; set; }
}
