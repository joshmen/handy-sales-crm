namespace HandySuites.Application.Productos.DTOs;

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
    /// <summary>Costo unitario actual del producto. Base de inventario valorizado/margen/rotación. Default 0.</summary>
    public decimal Costo { get; set; }
    public bool Activo { get; set; }
    /// <summary>Si true, PrecioBase ya incluye el impuesto (es lo que el cliente paga).</summary>
    public bool PrecioIncluyeIva { get; set; } = true;
    /// <summary>FK al catálogo TasasImpuesto. Si null, cae al default tenant.</summary>
    public int? TasaImpuestoId { get; set; }
    public string? TasaImpuestoNombre { get; set; }
    public decimal? TasaImpuestoTasa { get; set; }
    /// <summary>ClaveProdServ del SAT. Null = sin mapear.</summary>
    public string? ClaveSat { get; set; }
    /// <summary>ClaveUnidad del SAT (ej. "H87").</summary>
    public string? ClaveUnidad { get; set; }
    /// <summary>Si false, no se incluye en CFDI.</summary>
    public bool Facturable { get; set; } = true;
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
    /// <summary>Costo unitario actual del producto. Default 0.</summary>
    public decimal Costo { get; set; }
    public decimal CantidadActual { get; set; }
    public decimal StockMinimo { get; set; }
    public bool Activo { get; set; }
    public bool PrecioIncluyeIva { get; set; } = true;
    public int? TasaImpuestoId { get; set; }
    public string? ClaveSat { get; set; }
    public string? ClaveUnidad { get; set; }
    public bool Facturable { get; set; } = true;
}

public class ProductoFiltroDto
{
    public int? FamiliaId { get; set; }
    public int? CategoriaId { get; set; }
    public string? Busqueda { get; set; }
    public bool? Activo { get; set; }
    /// <summary>Si true, solo productos facturables sin ClaveSat asignada (tab "Sin clave SAT").</summary>
    public bool? SinClaveSat { get; set; }
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
    /// <summary>Conteo (a nivel tenant, no de página) de productos facturables sin ClaveSat.
    /// Alimenta el banner, el subtítulo y el badge del tab "Sin clave SAT".</summary>
    public int SinClaveSatCount { get; set; }
}

/// <summary>Asignación masiva de clave SAT a productos: por lista de IDs o por categoría.</summary>
public class ProductoBatchClaveSatDto
{
    public List<int> Ids { get; set; } = new();
    /// <summary>Si viene, aplica a TODOS los productos de esa categoría (ignora Ids).</summary>
    public int? CategoriaId { get; set; }
    public string ClaveSat { get; set; } = string.Empty;
    public string? ClaveUnidad { get; set; }
}
