namespace HandySuites.Application.Pedidos.DTOs;

/// <summary>
/// DTO para el endpoint POST /api/mobile/pedidos/eager-save (B.1, fix prod
/// 2026-06-04 post-incidente Rodrigo). Cuando el vendedor toca "Finalizar
/// pedido" en mobile, el cliente dispara este endpoint en background ANTES
/// del sync push normal — el server crea inmediatamente el Pedido como
/// Estado=Borrador para que sobreviva un wipe de SQLite local.
///
/// Diferencias vs <see cref="PedidoCreateDto"/>:
/// <list type="bullet">
///   <item><description>Requiere MobileRecordId (WDB local id) — idempotency key</description></item>
///   <item><description>Subtotal/Impuesto/Total pre-calculados client-side. El server NO
///         re-calcula BOGO/tasas (eso pasa al promover Estado=Borrador → Confirmado
///         vía sync push normal). El Borrador es solo durabilidad.</description></item>
///   <item><description>SIEMPRE Estado=Borrador (no decrementa inventario, no afecta RutasCarga,
///         no genera NumeroPedido — eso pasa al promover)</description></item>
///   <item><description>TipoVenta se registra pero NO dispara movimiento de inventario aunque
///         sea VentaDirecta</description></item>
/// </list>
/// </summary>
public class PedidoEagerSaveDto
{
    /// <summary>
    /// WatermelonDB local id del Pedido (string 16 chars random). Idempotency
    /// key — si ya existe un Pedido con este MobileRecordId + TenantId, el
    /// endpoint retorna el existente sin crear duplicado.
    /// </summary>
    public string MobileRecordId { get; set; } = string.Empty;

    public int ClienteId { get; set; }

    /// <summary>Fecha que el vendedor capturó. UTC desde mobile.</summary>
    public DateTime FechaPedido { get; set; }

    /// <summary>Solo informativo en Borrador — NO dispara inventory aunque sea VentaDirecta.</summary>
    public int TipoVenta { get; set; }

    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }

    public string? Notas { get; set; }
    public double? Latitud { get; set; }
    public double? Longitud { get; set; }

    public List<PedidoEagerSaveDetalleDto> Detalles { get; set; } = new();
}

/// <summary>
/// Detalle de pedido para eager-save. Cantidades + montos pre-calculados
/// client-side (no se aplica BOGO ni tasas en server).
/// </summary>
public class PedidoEagerSaveDetalleDto
{
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
}

/// <summary>
/// Respuesta del endpoint eager-save. El cliente la usa para actualizar el
/// WDB Pedido con el ServerId (para evitar duplicate creation en próximo sync push).
/// </summary>
public class PedidoEagerSaveResultDto
{
    public int ServerId { get; set; }
    public string MobileRecordId { get; set; } = string.Empty;
    public DateTime AckedAt { get; set; }

    /// <summary>EstadoPedido enum value. Para eager-save siempre = Borrador (0).</summary>
    public int Estado { get; set; }

    /// <summary>
    /// True si el endpoint encontró un Pedido pre-existente con el mismo
    /// MobileRecordId y lo retornó sin crear duplicado. False si creó uno nuevo.
    /// </summary>
    public bool Idempotent { get; set; }
}
