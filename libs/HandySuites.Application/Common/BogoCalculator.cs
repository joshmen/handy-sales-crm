using HandySuites.Domain.Common;
using HandySuites.Domain.Entities;

namespace HandySuites.Application.Common;

/// <summary>
/// Calcula la bonificación BOGO ("compra N regala M") para una línea de pedido.
/// Pure function — no toca DB, retorna decisiones para que el repositorio aplique.
///
/// Reglas:
/// - Solo aplica si la promo es TipoPromocion.Regalo, está activa y vigente.
/// - El producto debe estar incluido en PromocionProductos.
/// - Acumulativa: floor(qty / CantidadCompra) * CantidadBonificada.
/// - Mismo producto: descuento = cantidadBonificada * precioUnitario en línea X.
/// - Producto distinto: línea X queda con CantidadBonificada=0; el regalo
///   se materializa en una línea Y separada con descuento 100%.
/// </summary>
public static class BogoCalculator
{
    public readonly record struct Result(decimal CantidadBonificada, int? ProductoBonificadoId);

    /// <summary>
    /// Decide cuántas unidades bonificar para una línea con cantidad `qty` y la
    /// promoción `promo`. Devuelve `Result(0, null)` si no aplica.
    /// </summary>
    public static Result Calculate(decimal qty, Promocion? promo, int productoId, DateTime ahora)
    {
        if (promo is null) return new(0m, null);
        if (promo.TipoPromocion != TipoPromocion.Regalo) return new(0m, null);
        if (!promo.Activo || promo.EliminadoEn != null) return new(0m, null);
        if (ahora < promo.FechaInicio || ahora > promo.FechaFin) return new(0m, null);
        if (promo.PromocionProductos == null
            || !promo.PromocionProductos.Any(pp => pp.ProductoId == productoId))
            return new(0m, null);
        if (!promo.CantidadCompra.HasValue || !promo.CantidadBonificada.HasValue)
            return new(0m, null);
        if (promo.CantidadCompra.Value <= 0 || promo.CantidadBonificada.Value <= 0)
            return new(0m, null);

        var multiplos = Math.Floor(qty / promo.CantidadCompra.Value);
        if (multiplos < 1) return new(0m, null);

        var cantidadBonif = multiplos * promo.CantidadBonificada.Value;
        return new(cantidadBonif, promo.ProductoBonificadoId);
    }
}
