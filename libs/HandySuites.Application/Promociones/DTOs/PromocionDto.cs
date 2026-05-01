using HandySuites.Domain.Common;

namespace HandySuites.Application.Promociones.DTOs;

public class PromocionDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public decimal DescuentoPorcentaje { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public bool Activo { get; set; }
    public List<PromocionProductoInfo> Productos { get; set; } = new();

    public TipoPromocion TipoPromocion { get; set; } = TipoPromocion.Porcentaje;
    public decimal? CantidadCompra { get; set; }
    public decimal? CantidadBonificada { get; set; }
    public int? ProductoBonificadoId { get; set; }
    /// <summary>Display: nombre del producto bonificado para la UI (null = mismo producto).</summary>
    public string? ProductoBonificadoNombre { get; set; }
}

public class PromocionProductoInfo
{
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public string? ProductoCodigo { get; set; }
}
