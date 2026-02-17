using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

public enum MetodoPago
{
    Efectivo = 0,
    Transferencia = 1,
    Cheque = 2,
    TarjetaCredito = 3,
    TarjetaDebito = 4,
    Otro = 5
}

[Table("Cobros")]
public class Cobro : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("pedido_id")]
    public int PedidoId { get; set; }

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

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Pedido Pedido { get; set; } = null!;
    public Cliente Cliente { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
}
