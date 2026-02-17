namespace HandySales.Application.MovimientosInventario.DTOs;

public class MovimientoInventarioDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string? ProductoNombre { get; set; }
    public string? ProductoCodigo { get; set; }
    public string TipoMovimiento { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal CantidadAnterior { get; set; }
    public decimal CantidadNueva { get; set; }
    public string? Motivo { get; set; }
    public string? Comentario { get; set; }
    public int UsuarioId { get; set; }
    public string? UsuarioNombre { get; set; }
    public int? ReferenciaId { get; set; }
    public string? ReferenciaTipo { get; set; }
    public DateTime CreadoEn { get; set; }
}

public class MovimientoInventarioListaDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string? ProductoNombre { get; set; }
    public string? ProductoCodigo { get; set; }
    public string TipoMovimiento { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public decimal CantidadAnterior { get; set; }
    public decimal CantidadNueva { get; set; }
    public string? Motivo { get; set; }
    public string? UsuarioNombre { get; set; }
    public DateTime CreadoEn { get; set; }
}

public class MovimientoInventarioCreateDto
{
    public int ProductoId { get; set; }
    public string TipoMovimiento { get; set; } = string.Empty; // ENTRADA, SALIDA, AJUSTE
    public decimal Cantidad { get; set; }
    public string? Motivo { get; set; } // COMPRA, VENTA, DEVOLUCION, AJUSTE_INVENTARIO, MERMA
    public string? Comentario { get; set; }
}

public class MovimientoInventarioFiltroDto
{
    public int? ProductoId { get; set; }
    public string? TipoMovimiento { get; set; }
    public string? Motivo { get; set; }
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public string? Busqueda { get; set; }
    public int Pagina { get; set; } = 1;
    public int TamanoPagina { get; set; } = 20;
}

public class MovimientoInventarioPaginadoDto
{
    public List<MovimientoInventarioListaDto> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalPaginas { get; set; }
}
