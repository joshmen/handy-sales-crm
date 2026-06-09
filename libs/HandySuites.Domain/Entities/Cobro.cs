using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

public enum MetodoPago
{
    Efectivo = 0,
    Transferencia = 1,
    Cheque = 2,
    TarjetaCredito = 3,
    TarjetaDebito = 4,
    Otro = 5
}

/// <summary>
/// Modo de cobro — define semantica del pago. Patron Aspel/Microsip/SAP +
/// cumplimiento NIF D-1 / SAT MX (anticipo es pasivo, no ingreso).
///
/// PorPedido (default): cobro ligado a un Pedido especifico (PedidoId NOT NULL).
///   Backend aplica overpayment guard atomico per-pedido. Caso 99%.
///
/// AbonoFifo: cobro generico a cliente, backend distribuye FIFO contra
///   pedidos abiertos (saldo > 0) del cliente. PedidoId NULL en row root,
///   pero se crean CobroAplicaciones[] children con PedidoId per-split.
///
/// Anticipo: cobro genera saldoFavor (credit balance) intencional.
///   PedidoId NULL. Requiere SubscriptionPlan.PermitirAnticiposEnCampo=true
///   para tenant. Aplicable posteriormente a futuras ventas del cliente.
/// </summary>
public enum ModoCobro
{
    PorPedido = 0,
    AbonoFifo = 1,
    Anticipo = 2
}

[Table("Cobros")]
public class Cobro : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("mobile_record_id")]
    public string? MobileRecordId { get; set; }

    [Column("pedido_id")]
    public int? PedidoId { get; set; }

    [Column("cliente_id")]
    public int ClienteId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("monto")]
    public decimal Monto { get; set; }

    [Column("metodo_pago")]
    public MetodoPago MetodoPago { get; set; } = MetodoPago.Efectivo;

    [Column("fecha_cobro")]
    public DateTime FechaCobro { get; set; } = DateTime.UtcNow;

    [Column("referencia")]
    public string? Referencia { get; set; }

    [Column("notas")]
    public string? Notas { get; set; }

    /// <summary>
    /// 2026-06-08: modo explicito de cobro (PorPedido / AbonoFifo / Anticipo).
    /// Default PorPedido para retrocompat con rows historicos.
    /// </summary>
    [Column("modo")]
    public ModoCobro Modo { get; set; } = ModoCobro.PorPedido;

    /// <summary>
    /// 2026-06-08: true SOLO cuando Modo == Anticipo. Genera saldoFavor
    /// (credit balance) explicitamente. Requiere
    /// SubscriptionPlan.PermitirAnticiposEnCampo=true del tenant.
    /// Backend valida coherencia con Modo en CobroService.
    /// </summary>
    [Column("es_anticipo")]
    public bool EsAnticipo { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Pedido? Pedido { get; set; }
    public Cliente Cliente { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
}
