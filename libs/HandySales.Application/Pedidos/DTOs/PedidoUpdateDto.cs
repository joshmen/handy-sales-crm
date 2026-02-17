using HandySales.Domain.Entities;

namespace HandySales.Application.Pedidos.DTOs;

public class PedidoUpdateDto
{
    public DateTime? FechaEntregaEstimada { get; set; }
    public string? Notas { get; set; }
    public string? DireccionEntrega { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }
    public int? ListaPrecioId { get; set; }
    public List<DetallePedidoCreateDto>? Detalles { get; set; }
}

public class PedidoEstadoDto
{
    public EstadoPedido Estado { get; set; }
    public string? Notas { get; set; }
}

public class PedidoFiltroDto
{
    public int? ClienteId { get; set; }
    public int? UsuarioId { get; set; }
    public EstadoPedido? Estado { get; set; }
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public string? Busqueda { get; set; }
    public int? Pagina { get; set; }
    public int? TamanoPagina { get; set; }

    public int PaginaEfectiva => Pagina ?? 1;
    public int TamanoPaginaEfectivo => TamanoPagina ?? 20;
}

public class PedidoListaDto
{
    public int Id { get; set; }
    public required string NumeroPedido { get; set; }
    public int ClienteId { get; set; }
    public required string ClienteNombre { get; set; }
    public int UsuarioId { get; set; }
    public required string UsuarioNombre { get; set; }
    public DateTime FechaPedido { get; set; }
    public DateTime? FechaEntregaEstimada { get; set; }
    public EstadoPedido Estado { get; set; }
    public string EstadoNombre => Estado.ToString();
    public decimal Total { get; set; }
    public int CantidadProductos { get; set; }
}

public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalPaginas => (int)Math.Ceiling((double)TotalItems / TamanoPagina);
}
