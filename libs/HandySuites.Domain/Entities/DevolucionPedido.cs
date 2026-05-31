using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum MotivoDevolucion
{
    DanoTransporte = 0,
    NoConforme = 1,
    FechaVencimiento = 2,
    ErrorPedido = 3,
    ClienteRetracta = 4,
    ProductoIncorrecto = 5,
    Otro = 99,
}

public enum TipoReembolso
{
    /// <summary>Genera saldo a favor del cliente (cliente.Saldo -= MontoTotal).</summary>
    SaldoFavor = 0,

    /// <summary>Vendedor reembolsa en efectivo: resta de su corte de caja.</summary>
    Efectivo = 1,
}

public enum EstadoDevolucion
{
    Activa = 0,
    Anulada = 1,
}

/// <summary>
/// Devolucion de productos de un Pedido entregado. Generada por el vendedor en mobile.
/// Side-effects al guardar:
/// - Si TipoReembolso=SaldoFavor: cliente.Saldo -= MontoTotal.
/// - Si TipoReembolso=Efectivo: resta de aRecibir en cierre de ruta.
/// - NO modifica Pedido.Total (venta original queda; devolucion es transaccion separada).
/// - NO incrementa inventario automatico (producto puede estar danado; reintegrar manual).
/// Validacion: solo permitida si pedido.estado=Entregado. Over-return validado por
/// sum(cantidades_devueltas_previas) por linea contra cantidad original del DetallePedido.
/// </summary>
[Table("DevolucionesPedido")]
public class DevolucionPedido : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("mobile_record_id")]
    public string? MobileRecordId { get; set; }

    [Column("pedido_id")]
    public int PedidoId { get; set; }

    /// <summary>Denormalizado desde Pedido para queries rapidos (cartera por cliente).</summary>
    [Column("cliente_id")]
    public int ClienteId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("ruta_id")]
    public int? RutaId { get; set; }

    [Column("fecha_devolucion")]
    public DateTime FechaDevolucion { get; set; } = DateTime.UtcNow;

    [Column("motivo")]
    public MotivoDevolucion Motivo { get; set; }

    [Column("notas")]
    public string? Notas { get; set; }

    [Column("tipo_reembolso")]
    public TipoReembolso TipoReembolso { get; set; } = TipoReembolso.SaldoFavor;

    [Column("monto_total")]
    public decimal MontoTotal { get; set; }

    /// <summary>URL de foto opcional (evidencia de dano). Stampeada via MobileAttachmentEndpoints.</summary>
    [Column("foto_evidencia_url")]
    public string? FotoEvidenciaUrl { get; set; }

    [Column("estado")]
    public EstadoDevolucion Estado { get; set; } = EstadoDevolucion.Activa;

    [Column("anulada_por")]
    public string? AnuladaPor { get; set; }

    [Column("anulada_en")]
    public DateTime? AnuladaEn { get; set; }

    /// <summary>Motivo de la anulacion (mirror de Gasto.MotivoInvalidacion). Capturado por supervisor.</summary>
    [Column("motivo_anulacion")]
    public string? MotivoAnulacion { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Pedido Pedido { get; set; } = null!;
    public Cliente Cliente { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
    public RutaVendedor? Ruta { get; set; }
    public ICollection<DetalleDevolucion> Detalles { get; set; } = new List<DetalleDevolucion>();
}
