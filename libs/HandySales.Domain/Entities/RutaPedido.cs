using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("RutasPedidos")]
public class RutaPedido
{
    [Column("id")]
    public int Id { get; set; }

    [Column("ruta_id")]
    public int RutaId { get; set; }

    [Column("pedido_id")]
    public int PedidoId { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("estado")]
    public EstadoPedidoRuta Estado { get; set; } = EstadoPedidoRuta.Asignado;

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    [Column("actualizado_en")]
    public DateTime? ActualizadoEn { get; set; }

    // Navigation properties
    public RutaVendedor Ruta { get; set; } = null!;
    public Pedido Pedido { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
