using System.ComponentModel.DataAnnotations.Schema;

namespace HandySales.Domain.Entities;

[Table("RutasRetornoInventario")]
public class RutaRetornoInventario
{
    [Column("id")]
    public int Id { get; set; }

    [Column("ruta_id")]
    public int RutaId { get; set; }

    [Column("producto_id")]
    public int ProductoId { get; set; }

    [Column("tenant_id")]
    public int TenantId { get; set; }

    [Column("cantidad_inicial")]
    public int CantidadInicial { get; set; }

    [Column("vendidos")]
    public int Vendidos { get; set; }

    [Column("entregados")]
    public int Entregados { get; set; }

    [Column("devueltos")]
    public int Devueltos { get; set; }

    [Column("mermas")]
    public int Mermas { get; set; }

    [Column("rec_almacen")]
    public int RecAlmacen { get; set; }

    [Column("carga_vehiculo")]
    public int CargaVehiculo { get; set; }

    [Column("diferencia")]
    public int Diferencia { get; set; }

    [Column("ventas_monto")]
    public double VentasMonto { get; set; }

    [Column("activo")]
    public bool Activo { get; set; } = true;

    [Column("creado_en")]
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    [Column("actualizado_en")]
    public DateTime? ActualizadoEn { get; set; }

    // Navigation properties
    public RutaVendedor Ruta { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}
