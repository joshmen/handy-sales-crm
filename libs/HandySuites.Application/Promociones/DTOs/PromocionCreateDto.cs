using HandySuites.Domain.Common;

namespace HandySuites.Application.Promociones.DTOs;

public class PromocionCreateDto
{
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public List<int> ProductoIds { get; set; } = new();
    public decimal DescuentoPorcentaje { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }

    /// <summary>Default Porcentaje (legacy). Regalo activa los campos cantidadCompra/Bonificada.</summary>
    public TipoPromocion TipoPromocion { get; set; } = TipoPromocion.Porcentaje;
    public decimal? CantidadCompra { get; set; }
    public decimal? CantidadBonificada { get; set; }
    /// <summary>NULL = mismo producto. !=null = se regala otro producto distinto.</summary>
    public int? ProductoBonificadoId { get; set; }
}
