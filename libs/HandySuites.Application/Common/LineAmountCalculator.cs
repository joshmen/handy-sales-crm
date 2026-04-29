namespace HandySuites.Application.Common;

/// <summary>
/// Calcula subtotal/impuesto/total de una línea de pedido respetando el flag
/// `PrecioIncluyeIva` del producto y la tasa del catálogo TasasImpuesto.
///
/// Cuando `precioIncluyeIva = true` (default actual): el `precioUnitario` que
/// viene del producto YA tiene el impuesto incluido (es lo que el cliente paga).
/// El sistema desglosa la base sin impuesto para fines del CFDI SAT.
///
/// Ejemplo del bug reportado 2026-04-28: producto a $17, qty 5, IVA-incluido,
/// tasa 0.16 → subtotal $73.28 / impuesto $11.72 / total $85.00 (NO $98.60).
/// </summary>
public static class LineAmountCalculator
{
    public readonly record struct LineAmounts(decimal Subtotal, decimal Impuesto, decimal Total);

    /// <summary>
    /// Calcula los 3 importes de una línea de pedido.
    /// </summary>
    /// <param name="precioUnitario">Precio del producto (interpretación depende de precioIncluyeIva).</param>
    /// <param name="cantidad">Cantidad vendida.</param>
    /// <param name="descuento">Descuento absoluto en la línea (ya calculado).</param>
    /// <param name="tasa">Tasa de impuesto decimal (0.16 = 16%, 0.08 = 8%, 0.00 = exento).</param>
    /// <param name="precioIncluyeIva">Si true, precioUnitario ya incluye impuesto.</param>
    public static LineAmounts Calculate(
        decimal precioUnitario,
        decimal cantidad,
        decimal descuento,
        decimal tasa,
        bool precioIncluyeIva)
    {
        if (precioIncluyeIva)
        {
            // Total = lo que paga el cliente. Subtotal = base sin impuesto.
            var totalLinea = (precioUnitario * cantidad) - descuento;
            var divisor = 1m + tasa;
            var subtotalLinea = divisor == 0m ? totalLinea : totalLinea / divisor;
            var impuestoLinea = totalLinea - subtotalLinea;
            return new LineAmounts(subtotalLinea, impuestoLinea, totalLinea);
        }
        else
        {
            // Subtotal = base. Impuesto se suma. Total = lo que paga el cliente.
            var subtotalLinea = (precioUnitario * cantidad) - descuento;
            var impuestoLinea = subtotalLinea * tasa;
            var totalLinea = subtotalLinea + impuestoLinea;
            return new LineAmounts(subtotalLinea, impuestoLinea, totalLinea);
        }
    }
}
