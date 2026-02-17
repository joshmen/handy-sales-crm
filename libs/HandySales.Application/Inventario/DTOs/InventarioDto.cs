namespace HandySales.Application.Inventario.DTOs;

public class InventarioDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public decimal CantidadActual { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal StockMaximo { get; set; }
    public DateTime? ActualizadoEn { get; set; }
}

public class InventarioListaDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string? ProductoNombre { get; set; }
    public string? ProductoCodigo { get; set; }
    public string? ProductoImagenUrl { get; set; }
    public string? ProductoUnidadMedida { get; set; }
    public decimal CantidadActual { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal StockMaximo { get; set; }
    public bool BajoStock { get; set; }
    public DateTime? ActualizadoEn { get; set; }
}

public class InventarioFiltroDto
{
    public int? ProductoId { get; set; }
    public bool? BajoStock { get; set; }
    public string? Busqueda { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
}

public class InventarioPaginatedResult
{
    public List<InventarioListaDto> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalPaginas => (int)Math.Ceiling((double)TotalItems / TamanoPagina);
}
