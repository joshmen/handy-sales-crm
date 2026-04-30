using System.Text.Json.Serialization;

namespace HandySuites.Domain.Common;

/// <summary>
/// Tipo de promoción aplicable a productos.
/// - Porcentaje: descuento clásico % sobre el precio (ej: 10% off).
/// - Regalo: bonificación por cantidad (BOGO acumulativo). Ej: "compra 10 lleva 11"
///   o "compra 10 X lleva 1 Y". Triggered cuando cantidad >= CantidadCompra.
///
/// JSON: serializa como string ("Porcentaje" | "Regalo") para que la UI web pueda
/// usar valores legibles en discriminated unions y formularios. EF persiste como
/// int en columna `tipo_promocion`. Sync DTO mobile lo expone como int crudo.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TipoPromocion
{
    Porcentaje = 0,
    Regalo = 1,
}
