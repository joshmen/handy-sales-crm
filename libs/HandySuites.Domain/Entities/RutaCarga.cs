using System.ComponentModel.DataAnnotations.Schema;
using HandySuites.Domain.Common;

namespace HandySuites.Domain.Entities;

[Table("RutasCarga")]
public class RutaCarga : AuditableEntity
{
    [Column("id")]
    public int Id { get; set; }

    [Column("ruta_id")]
    public int RutaId { get; set; }

    [Column("producto_id")]
    public int ProductoId { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("cantidad_entrega")]
    public int CantidadEntrega { get; set; }

    [Column("cantidad_venta")]
    public int CantidadVenta { get; set; }

    [Column("cantidad_total")]
    public int CantidadTotal { get; set; }

    [Column("precio_unitario")]
    public double PrecioUnitario { get; set; }

    /// <summary>Unidades vendidas durante la jornada (venta directa con
    /// ruta activa). Se incrementa en tiempo real desde MobileVentaDirecta.
    /// Permite mostrar progreso real en mobile y pre-rellenar el cierre
    /// (RutaRetornoInventario.Vendidos) sin captura manual.</summary>
    [Column("cantidad_vendida")]
    public int CantidadVendida { get; set; }

    /// <summary>Unidades entregadas (de pedidos pre-asignados) durante la
    /// jornada. Se incrementa cuando el vendedor marca un RutaPedido como
    /// Entregado. Útil para tracking en tiempo real y cierre.</summary>
    [Column("cantidad_entregada")]
    public int CantidadEntregada { get; set; }

    // Navigation properties
    public RutaVendedor Ruta { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
