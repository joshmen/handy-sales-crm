namespace HandySuites.Domain.Common;

/// <summary>
/// Tipo de promoción aplicable a productos.
/// - Porcentaje: descuento clásico % sobre el precio (ej: 10% off).
/// - Regalo: bonificación por cantidad (BOGO acumulativo). Ej: "compra 10 lleva 11"
///   o "compra 10 X lleva 1 Y". Triggered cuando cantidad >= CantidadCompra.
/// </summary>
public enum TipoPromocion
{
    Porcentaje = 0,
    Regalo = 1,
}
