namespace HandySuites.Application.Pedidos.DTOs;

/// <summary>
/// Agregado server-side de la lista de pedidos. Calculado en SQL (SUM/COUNT)
/// sobre TODO el conjunto filtrado (rango tz-correcto + usuario + tipoVenta +
/// estado + busqueda), NO sobre la pagina visible. Se devuelve junto a los
/// items en la respuesta del list para alimentar los KPIs de la pantalla de
/// Pedidos sin un segundo round-trip. Mismo patron que GastosEndpoints (KPI en
/// la misma respuesta del list).
/// </summary>
public class PedidoResumenDto
{
    /// <summary>Suma de Total de los pedidos NO cancelados del rango filtrado.</summary>
    public decimal TotalVendido { get; set; }

    /// <summary>TotalVendido / cantidad de pedidos NO cancelados (0 si no hay).</summary>
    public decimal TicketPromedio { get; set; }

    /// <summary>Cantidad de pedidos en estado Confirmado.</summary>
    public int Confirmados { get; set; }

    /// <summary>Cantidad de pedidos en estado Borrador.</summary>
    public int Borradores { get; set; }

    /// <summary>Cantidad total de pedidos del rango filtrado (incluye cancelados).</summary>
    public int TotalPedidos { get; set; }
}
