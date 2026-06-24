namespace HandySuites.Application.Inventario.DTOs;

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
    // Nullables para que [AsParameters] no los marque como requeridos.
    public int? Pagina { get; set; }
    public int? TamanoPagina { get; set; }
}

public class InventarioPaginatedResult
{
    public List<InventarioListaDto> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalPaginas => (int)Math.Ceiling((double)TotalItems / TamanoPagina);
}

/// <summary>
/// Resumen agregado del inventario del tenant (KPIs de la página de Inventario).
/// Catalog-wide, no por página. ValorInventario = Σ(cantidadActual × precioBase). 2026-06-18.
/// </summary>
public class InventarioResumenDto
{
    public decimal ValorInventario { get; set; }
    public int SkusActivos { get; set; }
    public int StockBajo { get; set; }
    public int Agotados { get; set; }
}
