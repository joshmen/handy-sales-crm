namespace HandySuites.Domain.Common;

/// <summary>
/// Políticas de negocio para Venta Directa (cash sale en ruta).
/// </summary>
public static class VentaDirectaPolicy
{
    /// <summary>
    /// Ventana (segundos) para detectar ventas directas duplicadas server-side.
    ///
    /// Contexto (incidente prod 2026-06-23): el móvil puede crear DOS ventas
    /// directas para la MISMA transacción (doble-submit / reintento del vendedor),
    /// cada una con su propio mobile_record_id. Como la idempotencia por
    /// mobile_record_id solo colapsa reintentos del MISMO registro, no detecta
    /// estas copias → se duplican pedidos, cobros e inventario.
    ///
    /// Red de seguridad: si llega una venta directa con la misma huella
    /// (tenant + vendedor + cliente + total) que otra creada dentro de esta
    /// ventana, se colapsa a la existente en vez de crear otra. El fix de raíz
    /// es el guard in-flight del móvil; esto cubre APKs viejos en campo.
    ///
    /// 300s (5 min): cubre el patrón observado (copias separadas hasta ~135s,
    /// más demoras de sync). Dos ventas directas idénticas al mismo cliente por
    /// el mismo vendedor dentro de 5 min es prácticamente siempre un error en
    /// venta de ruta. Cada colapso se registra (LogWarning) para auditoría.
    /// </summary>
    public const int DedupeWindowSeconds = 300;
}
