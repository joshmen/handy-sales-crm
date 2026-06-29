namespace HandySuites.Application.Pedidos.DTOs;

/// <summary>
/// Respuesta del list GET /pedidos: pagina de items + paginacion + agregado
/// (resumen) calculado en SQL sobre TODO el rango filtrado. Conserva los
/// nombres de campo de <see cref="PaginatedResult{T}"/> (Items/TotalItems/
/// Pagina/TamanoPagina) para no romper el web client existente; agrega
/// <see cref="Resumen"/> como propiedad nueva. Mismo patron que
/// GastosEndpoints (KPI en la misma respuesta del list).
/// </summary>
public class PedidoListaResultDto
{
    public List<PedidoListaDto> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Pagina { get; set; }
    public int TamanoPagina { get; set; }
    public int TotalPaginas => TamanoPagina > 0 ? (int)System.Math.Ceiling((double)TotalItems / TamanoPagina) : 0;

    /// <summary>Agregado server-side sobre el conjunto filtrado completo.</summary>
    public PedidoResumenDto Resumen { get; set; } = new();
}
