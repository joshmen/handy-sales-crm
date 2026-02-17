namespace HandySales.Application.Productos.DTOs;

public class ProductoDto
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
    public required string CodigoBarra { get; set; }
    public required string Descripcion { get; set; }
    public string? ImagenUrl { get; set; }
    public int FamiliaId { get; set; }
    public int CategoraId { get; set; }
    public int UnidadMedidaId { get; set; }
    public decimal PrecioBase { get; set; }
    public bool Activo { get; set; }
}

public class ProductoListaDto
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
    public required string CodigoBarra { get; set; }
    public string? Descripcion { get; set; }
    public string? ImagenUrl { get; set; }
    public string? FamiliaNombre { get; set; }
    public string? CategoriaNombre { get; set; }
    public string? UnidadNombre { get; set; }
    public decimal PrecioBase { get; set; }
    public decimal CantidadActual { get; set; }
    public decimal StockMinimo { get; set; }
    public bool Activo { get; set; }
}

public class ProductoFiltroDto
{
    public int? FamiliaId { get; set; }
    public int? CategoriaId { get; set; }
    public string? Busqueda { get; set; }
    public bool? Activo { get; set; }
    public int? Pagina { get; set; }
    public int? TamanoPagina { get; set; }

    public int PaginaEfectiva => Pagina ?? 1;
    public int TamanoPaginaEfectivo => TamanoPagina ?? 20;
}

public class ProductoPaginatedResult
{
    public List<ProductoListaDto> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalPaginas => (int)Math.Ceiling((double)TotalItems / TamanoPagina);
}
