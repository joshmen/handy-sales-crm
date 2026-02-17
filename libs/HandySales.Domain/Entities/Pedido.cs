using System.ComponentModel.DataAnnotations.Schema;
using HandySales.Domain.Common;

namespace HandySales.Domain.Entities;

public enum EstadoPedido
{
    Borrador = 0,
    Enviado = 1,
    Confirmado = 2,
    EnProceso = 3,
    EnRuta = 4,
    Entregado = 5,
    Cancelado = 6
}

[Table("Pedidos")]
public class Pedido : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("cliente_id")]
    public int ClienteId { get; set; }

    [Column("usuario_id")]
    public int UsuarioId { get; set; }

    [Column("numero_pedido")]
    public string NumeroPedido { get; set; } = null!;

    [Column("fecha_pedido")]
    public DateTime FechaPedido { get; set; } = DateTime.UtcNow;

    [Column("fecha_entrega_estimada")]
    public DateTime? FechaEntregaEstimada { get; set; }

    [Column("fecha_entrega_real")]
    public DateTime? FechaEntregaReal { get; set; }

    [Column("estado")]
    public EstadoPedido Estado { get; set; } = EstadoPedido.Borrador;

    [Column("subtotal")]
    public decimal Subtotal { get; set; }

    [Column("descuento")]
    public decimal Descuento { get; set; }

    [Column("impuestos")]
    public decimal Impuestos { get; set; }

    [Column("total")]
    public decimal Total { get; set; }

    [Column("notas")]
    public string? Notas { get; set; }

    [Column("direccion_entrega")]
    public string? DireccionEntrega { get; set; }

    [Column("latitud")]
    public double? Latitud { get; set; }

    [Column("longitud")]
    public double? Longitud { get; set; }

    [Column("lista_precio_id")]
    public int? ListaPrecioId { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Cliente Cliente { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
    public ListaPrecio? ListaPrecio { get; set; }
    public ICollection<DetallePedido> Detalles { get; set; } = new List<DetallePedido>();
}
